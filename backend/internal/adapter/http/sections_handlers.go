package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"

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

func (h *SectionHandler) getSections(w http.ResponseWriter, r *http.Request) error {
	var metas []postgres.SectionMetaModel
	if err := h.store.DB.WithContext(r.Context()).Order("\"order\" ASC").Find(&metas).Error; err != nil {
		log.Printf("getSections meta query error: %v", err)
		return NewAppError(http.StatusInternalServerError, "Failed to fetch sections", err)
	}

	var dataList []postgres.SectionDataModel
	if err := h.store.DB.WithContext(r.Context()).Find(&dataList).Error; err != nil {
		log.Printf("getSections data query error: %v", err)
		return NewAppError(http.StatusInternalServerError, "Failed to fetch sections", err)
	}

	dataMap := make(map[string]postgres.SectionDataModel)
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
	return nil
}

func (h *SectionHandler) createSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body struct {
		ID          string          `json:"id"`
		DisplayName string          `json:"displayName"`
		Type        string          `json:"type"`
		Order       *int            `json:"order"`
		SortOrder   string          `json:"sortOrder"`
		Data        json.RawMessage `json:"data"`
	}
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if body.ID == "" || body.DisplayName == "" || body.Type == "" {
		return NewAppError(http.StatusBadRequest, "id, displayName, and type are required", nil)
	}
	if len(body.Data) == 0 {
		body.Data = json.RawMessage(`{}`)
	}

	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&postgres.SectionMetaModel{}).Where("id = ?", body.ID).Count(&count).Error; err != nil {
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
			_ = tx.Model(&postgres.SectionMetaModel{}).Select("MAX(\"order\")").Scan(&maxOrder)
			orderNo = maxOrder + 1
		}

		meta := postgres.SectionMetaModel{
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

		data := postgres.SectionDataModel{
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
			return NewAppError(http.StatusConflict, "Section with this ID already exists", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to create section", err)
	}

	h.logAdmin(r.Context(), "create", "section", body.ID, "info", user, map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": body.ID})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Section created successfully", "section": map[string]any{"id": body.ID, "meta": map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": body.ID, "editable": true, "sortOrder": body.SortOrder}, "data": json.RawMessage(body.Data)}})
	return nil
}

func (h *SectionHandler) updateSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}

	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var d postgres.SectionDataModel
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
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to update section", err)
	}

	h.logAdmin(r.Context(), "update", "section", id, "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
	return nil
}

func (h *SectionHandler) patchSectionMeta(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
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
		return nil
	}
	result := h.store.DB.WithContext(r.Context()).Model(&postgres.SectionMetaModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update section meta", result.Error)
	}
	if result.RowsAffected == 0 {
		return NewAppError(http.StatusNotFound, "Not found", nil)
	}
	h.logAdmin(r.Context(), "update", "sectionMeta", id, "info", user, map[string]any{"updates": patch})
	writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
	return nil
}

func (h *SectionHandler) deleteSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", id).Delete(&postgres.SectionDataModel{}).Error; err != nil {
			return err
		}
		result := tx.Where("id = ?", id).Delete(&postgres.SectionMetaModel{})
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
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to delete section", err)
	}
	h.logAdmin(r.Context(), "delete", "section", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Section deleted successfully"})
	return nil
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
