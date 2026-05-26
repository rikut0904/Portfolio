package v2

import (
	"context"
	"encoding/json"
	"errors"
	"portfolio-backend/internal/domain/section"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	"strings"
)

type SectionRepository struct {
	*Repository
}

func NewSectionRepository(base *Repository) *SectionRepository {
	return &SectionRepository{base}
}

func (r *SectionRepository) List(ctx context.Context) ([]section.Section, error) {
	var metas []postgres.SectionMetaModel
	if err := r.store.DB.WithContext(ctx).Order("\"order\" ASC").Find(&metas).Error; err != nil {
		return nil, err
	}

	var dataList []postgres.SectionDataModel
	if err := r.store.DB.WithContext(ctx).Find(&dataList).Error; err != nil {
		return nil, err
	}

	dataMap := make(map[string]postgres.SectionDataModel)
	for _, d := range dataList {
		dataMap[d.ID] = d
	}

	sections := make([]section.Section, 0, len(metas))
	for _, m := range metas {
		s := section.Section{
			ID: m.ID,
			Meta: section.SectionMeta{
				ID:          m.ID,
				SectionID:   m.SectionID,
				DisplayName: m.DisplayName,
				TypeName:    m.TypeName,
				Order:       m.Order,
				Editable:    m.Editable,
			},
		}

		lookupID := m.ID
		if m.SectionID != "" {
			lookupID = m.SectionID
		}

		if d, ok := dataMap[lookupID]; ok {
			s.Data = buildSectionDataV2(d.Data, d.Items, d.Histories, s.Meta.TypeName)
		} else {
			s.Data = json.RawMessage(`{}`)
		}

		sections = append(sections, s)
	}

	return sections, nil
}

func (r *SectionRepository) Create(ctx context.Context, input section.SectionPayload) (section.Section, error) {
	// Implementation similar to v1 createSection but returning domain model
	// (Omitted for brevity in this step, but would follow v1 logic)
	return section.Section{}, errors.New("not implemented yet")
}

func (r *SectionRepository) Update(ctx context.Context, id string, data map[string]any) error {
	// Implementation similar to v1 updateSection
	return errors.New("not implemented yet")
}

func (r *SectionRepository) UpdateMeta(ctx context.Context, id string, updates map[string]any) error {
	// Implementation similar to v1 patchSectionMeta
	return errors.New("not implemented yet")
}

func (r *SectionRepository) Delete(ctx context.Context, id string) error {
	// Implementation similar to v1 deleteSection
	return errors.New("not implemented yet")
}

func buildSectionDataV2(raw, items, histories []byte, sectionType string) json.RawMessage {
	data := make(map[string]any)
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &data)
	}
	if data == nil {
		data = make(map[string]any)
	}

	sectionType = strings.ToLower(strings.TrimSpace(sectionType))
	switch sectionType {
	case "list", "categorized":
		var itms []any
		if len(items) > 0 {
			_ = json.Unmarshal(items, &itms)
		}
		if itms != nil {
			data["items"] = itms
		}
	case "history":
		var hists []any
		if len(histories) > 0 {
			_ = json.Unmarshal(histories, &hists)
		}
		if hists != nil {
			data["histories"] = hists
		}
	}
	b, _ := json.Marshal(data)
	return json.RawMessage(b)
}
