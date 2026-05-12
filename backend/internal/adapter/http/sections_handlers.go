package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"portfolio-backend/internal/infrastructure/auth"

	"gorm.io/gorm"
)

type sectionMeta struct {
	DisplayName string `json:"displayName"`
	Type        string `json:"type"`
	Order       int    `json:"order"`
	Editable    bool   `json:"editable"`
	SortOrder   string `json:"sortOrder"`
}

type section struct {
	ID   string          `json:"id"`
	Meta sectionMeta     `json:"meta"`
	Data json.RawMessage `json:"data"`
}

type sectionMetaModel struct {
	ID          string `gorm:"primaryKey;column:id"`
	SectionID   string `gorm:"column:section_id"`
	DisplayName string `gorm:"column:displayName"`
	TypeName    string `gorm:"column:type_name"`
	Order       int    `gorm:"column:order"`
	Editable    bool   `gorm:"column:editable"`
}

func (sectionMetaModel) TableName() string {
	return "sectionMeta"
}

type sectionDataModel struct {
	ID               string          `gorm:"primaryKey;column:id"`
	TypeName         string          `gorm:"column:type_name"`
	Data             json.RawMessage `gorm:"column:data;type:jsonb"`
	DataName         string          `gorm:"column:data_name"`
	DataHometown     string          `gorm:"column:data_hometown"`
	DataHobbies      string          `gorm:"column:data_hobbies"`
	DataProfileImage string          `gorm:"column:data_profileImage"`
	DataUniversity   string          `gorm:"column:data_university"`
	Items            json.RawMessage `gorm:"column:items;type:jsonb"`
	Histories        json.RawMessage `gorm:"column:histories;type:jsonb"`
}

func (sectionDataModel) TableName() string {
	return "sections"
}

func (h *Handler) getSections(w http.ResponseWriter, r *http.Request) {
	var metas []sectionMetaModel
	if err := h.store.DB.WithContext(r.Context()).Order("\"order\" ASC").Find(&metas).Error; err != nil {
		log.Printf("getSections meta query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch sections"})
		return
	}

	var dataList []sectionDataModel
	if err := h.store.DB.WithContext(r.Context()).Find(&dataList).Error; err != nil {
		log.Printf("getSections data query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch sections"})
		return
	}

	dataMap := make(map[string]sectionDataModel)
	for _, d := range dataList {
		dataMap[d.ID] = d
	}

	sections := make([]section, 0, len(metas))
	for _, m := range metas {
		s := section{
			ID: m.ID,
			Meta: sectionMeta{
				DisplayName: m.DisplayName,
				Type:        normalizeSectionType(m.TypeName),
				Order:       m.Order,
				Editable:    m.Editable,
			},
		}

		// Handle mapping between sectionMeta and sections
		lookupID := m.ID
		if m.SectionID != "" {
			lookupID = m.SectionID
		}

		if d, ok := dataMap[lookupID]; ok {
			s.Data = buildSectionData(d.Data, d.Items, d.Histories, s.Meta.Type, d.DataName, d.DataHometown, d.DataHobbies, d.DataProfileImage, d.DataUniversity)
		} else {
			s.Data = json.RawMessage(`{}`)
		}

		sections = append(sections, s)
	}

	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"sections": sections})
}

func (h *Handler) createSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body struct {
		ID          string          `json:"id"`
		DisplayName string          `json:"displayName"`
		Type        string          `json:"type"`
		Order       *int            `json:"order"`
		SortOrder   string          `json:"sortOrder"`
		Data        json.RawMessage `json:"data"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if body.ID == "" || body.DisplayName == "" || body.Type == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "id, displayName, and type are required"})
		return
	}
	if len(body.Data) == 0 {
		body.Data = json.RawMessage(`{}`)
	}

	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&sectionMetaModel{}).Where("id = ?", body.ID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("conflict")
		}

		orderNo := 0
		if body.Order != nil {
			orderNo = *body.Order
		} else {
			var maxOrder int
			_ = tx.Model(&sectionMetaModel{}).Select("MAX(\"order\")").Scan(&maxOrder)
			orderNo = maxOrder + 1
		}

		meta := sectionMetaModel{
			ID:          body.ID,
			SectionID:   body.ID,
			DisplayName: body.DisplayName,
			TypeName:    body.Type,
			Order:       orderNo,
			Editable:    true,
		}
		if err := tx.Create(&meta).Error; err != nil {
			return err
		}

		data := sectionDataModel{
			ID:       body.ID,
			TypeName: body.Type,
			Data:     body.Data,
		}
		if err := tx.Create(&data).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		if err.Error() == "conflict" {
			writeJSON(w, http.StatusConflict, map[string]any{"error": "Section with this ID already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}

	h.logAdmin(r.Context(), "create", "section", body.ID, "info", user, map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": body.ID})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Section created successfully", "section": map[string]any{"id": body.ID, "meta": map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": body.ID, "editable": true, "sortOrder": body.SortOrder}, "data": json.RawMessage(body.Data)}})
}

func (h *Handler) updateSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}

	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var d sectionDataModel
		if err := tx.First(&d, "id = ?", id).Error; err != nil {
			return err
		}

		var currentData map[string]any
		if len(d.Data) > 0 {
			_ = json.Unmarshal(d.Data, &currentData)
		}
		if currentData == nil {
			currentData = make(map[string]any)
		}

		for k, v := range patch {
			currentData[k] = v
		}

		newData, _ := json.Marshal(currentData)
		return tx.Model(&d).Update("data", newData).Error
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update section"})
		return
	}

	h.logAdmin(r.Context(), "update", "section", id, "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) patchSectionMeta(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	updates := make(map[string]any)
	for k, v := range patch {
		switch k {
		case "displayName":
			updates["displayName"] = v
		case "type":
			updates["type_name"] = v
		case "order":
			updates["order"] = v
		case "editable":
			updates["editable"] = v
		}
	}
	if len(updates) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
		return
	}
	result := h.store.DB.WithContext(r.Context()).Model(&sectionMetaModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update section meta"})
		return
	}
	if result.RowsAffected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "sectionMeta", id, "info", user, map[string]any{"updates": patch})
	writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
}

func (h *Handler) deleteSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", id).Delete(&sectionDataModel{}).Error; err != nil {
			return err
		}
		result := tx.Where("id = ?", id).Delete(&sectionMetaModel{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("not found")
		}
		return nil
	})
	if err != nil {
		if err.Error() == "not found" {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete section"})
		return
	}
	h.logAdmin(r.Context(), "delete", "section", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Section deleted successfully"})
}

func normalizeSectionType(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	if v == "" {
		return "list"
	}
	return v
}

func buildSectionData(raw, items, histories []byte, sectionType, name, hometown, hobbies, profileImage, university string) json.RawMessage {
	data := make(map[string]any)
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &data)
	}
	if data == nil {
		data = make(map[string]any)
	}

	switch sectionType {
	case "profile":
		if name != "" {
			data["name"] = name
		}
		if hometown != "" {
			data["hometown"] = hometown
		}
		if hobbies != "" {
			data["hobbies"] = hobbies
		}
		if profileImage != "" {
			data["profileImage"] = profileImage
		}
		if university != "" {
			data["university"] = university
		}
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
