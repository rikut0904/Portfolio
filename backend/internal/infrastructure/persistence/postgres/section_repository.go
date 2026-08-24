package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"gorm.io/gorm"
	"portfolio-backend/internal/domain/section"
)

type SectionRepository struct{ store *Store }

func NewSectionRepository(store *Store) *SectionRepository { return &SectionRepository{store: store} }

func (r *SectionRepository) List(ctx context.Context) ([]section.Section, error) {
	var dataList []SectionDataModel
	if err := r.store.DB.WithContext(ctx).Order(`"order" ASC, id ASC`).Find(&dataList).Error; err != nil {
		return nil, err
	}
	sections := make([]section.Section, 0, len(dataList))
	for _, data := range dataList {
		typeName := inferSectionType(data)
		displayName := data.DisplayName
		if displayName == "" {
			displayName = data.ID
		}
		item := section.Section{ID: data.ID, Meta: section.SectionMeta{ID: data.ID, SectionID: data.ID, DisplayName: displayName, TypeName: typeName, Order: data.Order, Editable: data.Editable}, Data: buildSectionData(data.Data, data.Items, data.Histories, typeName)}
		sections = append(sections, item)
	}
	return sections, nil
}

func (r *SectionRepository) Create(ctx context.Context, input section.SectionPayload) (section.Section, error) {
	if strings.TrimSpace(input.ID) == "" || strings.TrimSpace(input.DisplayName) == "" || strings.TrimSpace(input.TypeName) == "" {
		return section.Section{}, errors.New("invalid section")
	}
	var result section.Section
	err := r.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&SectionDataModel{}).Where("id = ?", input.ID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("conflict")
		}
		order := 0
		if input.Order != nil {
			order = *input.Order
		} else {
			_ = tx.Model(&SectionDataModel{}).Select(`MAX("order")`).Scan(&order)
			order++
		}
		data := splitSectionData(input.Data, input.TypeName)
		if err := tx.Create(&SectionDataModel{ID: input.ID, DisplayName: input.DisplayName, TypeName: input.TypeName, Order: order, Editable: true, Data: data.data, Items: data.items, Histories: data.histories}).Error; err != nil {
			return err
		}
		result = section.Section{ID: input.ID, Meta: section.SectionMeta{ID: input.ID, SectionID: input.ID, DisplayName: input.DisplayName, TypeName: input.TypeName, Order: order, Editable: true}, Data: input.Data}
		return nil
	})
	return result, err
}

func (r *SectionRepository) Update(ctx context.Context, id string, data map[string]any) error {
	return r.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current SectionDataModel
		if err := tx.First(&current, "id = ?", id).Error; err != nil {
			if err.Error() == "record not found" {
				return errors.New("not found")
			}
			return err
		}
		updates := make(map[string]any)
		if items, ok := data["items"]; ok {
			encoded, _ := json.Marshal(items)
			updates["items"] = json.RawMessage(encoded)
			delete(data, "items")
		}
		if histories, ok := data["histories"]; ok {
			encoded, _ := json.Marshal(histories)
			updates["histories"] = json.RawMessage(encoded)
			delete(data, "histories")
		}
		if len(data) > 0 {
			var currentData map[string]any
			_ = json.Unmarshal(current.Data, &currentData)
			if currentData == nil {
				currentData = map[string]any{}
			}
			for key, value := range data {
				currentData[key] = value
			}
			encoded, _ := json.Marshal(currentData)
			updates["data"] = json.RawMessage(encoded)
		}
		if len(updates) == 0 {
			return nil
		}
		return tx.Model(&current).Updates(updates).Error
	})
}

func (r *SectionRepository) UpdateMeta(ctx context.Context, id string, updates map[string]any) error {
	result := r.store.DB.WithContext(ctx).Model(&SectionDataModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("not found")
	}
	return nil
}

func (r *SectionRepository) Delete(ctx context.Context, id string) error {
	return r.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where("id = ?", id).Delete(&SectionDataModel{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("not found")
		}
		return nil
	})
}

type sectionDataParts struct{ data, items, histories json.RawMessage }

func splitSectionData(raw json.RawMessage, typeName string) sectionDataParts {
	parts := sectionDataParts{data: json.RawMessage(`{}`), items: json.RawMessage(`[]`), histories: json.RawMessage(`[]`)}
	var values map[string]any
	_ = json.Unmarshal(raw, &values)
	for key, target := range map[string]*json.RawMessage{"items": &parts.items, "histories": &parts.histories} {
		if value, ok := values[key]; ok {
			encoded, _ := json.Marshal(value)
			*target = encoded
			delete(values, key)
		}
	}
	if len(values) > 0 {
		encoded, _ := json.Marshal(values)
		parts.data = encoded
	}
	return parts
}

func normalizeSectionType(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "list"
	}
	return value
}

func inferSectionType(data SectionDataModel) string {
	typeName := normalizeSectionType(data.TypeName)
	if typeName == "list" && len(data.Histories) > 2 && string(data.Histories) != "[]" {
		return "history"
	}
	if data.ID == "profile" {
		return "profile"
	}
	return typeName
}

func buildSectionData(raw, items, histories []byte, typeName string) json.RawMessage {
	data := map[string]any{}
	_ = json.Unmarshal(raw, &data)
	if data == nil {
		data = map[string]any{}
	}
	switch typeName {
	case "list", "categorized":
		var values []any
		_ = json.Unmarshal(items, &values)
		if values != nil {
			data["items"] = values
		}
	case "history":
		var values []any
		_ = json.Unmarshal(histories, &values)
		if values != nil {
			data["histories"] = values
		}
	}
	encoded, _ := json.Marshal(data)
	return encoded
}
