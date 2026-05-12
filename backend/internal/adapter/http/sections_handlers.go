package httpapi

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"portfolio-backend/internal/auth"
)

type sectionMeta struct {
	DisplayName string `json:"displayName"`
	Type        string `json:"type"`
	Order       int    `json:"order"`
	Editable    bool   `json:"editable"`
	SortOrder   string `json:"sortOrder,omitempty"`
}

type section struct {
	ID   string          `json:"id"`
	Meta sectionMeta     `json:"meta"`
	Data json.RawMessage `json:"data"`
}

func isZeroJSON(raw []byte) bool {
	trimmed := strings.TrimSpace(string(raw))
	return trimmed == "" || trimmed == "null" || trimmed == "{}"
}

func isEmptyJSONArray(raw []byte) bool {
	return strings.TrimSpace(string(raw)) == "[]"
}

func normalizeVisibilityStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "public", "published", "open", "active", "visible", "公開":
		return "公開"
	case "private", "draft", "hidden", "inactive", "非公開":
		return "非公開"
	default:
		return strings.TrimSpace(v)
	}
}

func normalizeDeployStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "deployed", "live", "production", "公開中":
		return "公開中"
	case "undeployed", "not_deployed", "draft", "staging", "未公開":
		return "未公開"
	default:
		return strings.TrimSpace(v)
	}
}

func normalizeSectionType(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "single", "profile":
		return "single"
	case "categorized", "category":
		return "categorized"
	case "list":
		return "list"
	case "history", "timeline":
		return "history"
	default:
		if s == "" {
			return "list"
		}
		return strings.TrimSpace(v)
	}
}

func buildSectionData(rawData, rawItems, rawHistories []byte, sectionType string, name, hometown, hobbies, profileImage, university string) []byte {
	sectionType = strings.ToLower(strings.TrimSpace(sectionType))
	var rawObj map[string]any
	if !isZeroJSON(rawData) {
		_ = json.Unmarshal(rawData, &rawObj)
	}
	if rawObj == nil {
		rawObj = map[string]any{}
	}

	profile := map[string]string{
		"name":         strings.TrimSpace(name),
		"hometown":     strings.TrimSpace(hometown),
		"hobbies":      strings.TrimSpace(hobbies),
		"profileImage": strings.TrimSpace(profileImage),
		"university":   strings.TrimSpace(university),
	}

	switch sectionType {
	case "single", "profile":
		if len(rawObj) > 0 {
			return rawData
		}
		if profile["name"] != "" || profile["hometown"] != "" || profile["hobbies"] != "" || profile["profileImage"] != "" || profile["university"] != "" {
			b, _ := json.Marshal(map[string]any{"data": profile})
			return b
		}
	case "history", "timeline":
		if v, ok := rawObj["histories"]; ok && v != nil {
			return rawData
		}
		if v, ok := rawObj["items"]; ok && v != nil {
			return rawData
		}
		if !isZeroJSON(rawHistories) && !isEmptyJSONArray(rawHistories) {
			b, _ := json.Marshal(map[string]any{"histories": json.RawMessage(rawHistories)})
			return b
		}
		if !isZeroJSON(rawItems) && !isEmptyJSONArray(rawItems) {
			b, _ := json.Marshal(map[string]any{"histories": json.RawMessage(rawItems)})
			return b
		}
		if len(rawObj) > 0 {
			return rawData
		}
	case "list":
		if v, ok := rawObj["lists"]; ok && v != nil {
			return rawData
		}
		if v, ok := rawObj["items"]; ok && v != nil {
			return rawData
		}
		if !isZeroJSON(rawItems) {
			b, _ := json.Marshal(map[string]any{"lists": json.RawMessage(rawItems)})
			return b
		}
		if len(rawObj) > 0 {
			return rawData
		}
	default:
		if len(rawObj) > 0 {
			return rawData
		}
		if !isZeroJSON(rawHistories) || !isZeroJSON(rawItems) {
			payload := map[string]any{}
			if !isZeroJSON(rawHistories) {
				payload["histories"] = json.RawMessage(rawHistories)
			}
			if !isZeroJSON(rawItems) {
				payload["items"] = json.RawMessage(rawItems)
			}
			if len(payload) > 0 {
				b, _ := json.Marshal(payload)
				return b
			}
		}
	}

	return []byte(`{}`)
}

func (h *Handler) getSections(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT
			sm.id,
			COALESCE(to_jsonb(sm)->>'displayName', to_jsonb(sm)->>'display_name', '') AS display_name,
			COALESCE(NULLIF(to_jsonb(sm)->>'type_name', ''), NULLIF(to_jsonb(sm)->>'type', ''), NULLIF(to_jsonb(s)->>'type_name', ''), NULLIF(to_jsonb(s)->>'type', ''), 'list') AS section_type,
			COALESCE(NULLIF(to_jsonb(sm)->>'order', '')::int, 0),
			COALESCE(NULLIF(to_jsonb(sm)->>'editable', '')::boolean, true),
			'' as sort_order,
			COALESCE(to_jsonb(s)->'data', '{}'::jsonb),
			COALESCE(to_jsonb(s)->>'data_name', to_jsonb(s)->>'name', ''),
			COALESCE(to_jsonb(s)->>'data_hometown', to_jsonb(s)->>'hometown', ''),
			COALESCE(to_jsonb(s)->>'data_hobbies', to_jsonb(s)->>'hobbies', ''),
			COALESCE(to_jsonb(s)->>'data_profileImage', to_jsonb(s)->>'data_profile_image', to_jsonb(s)->>'profileImage', to_jsonb(s)->>'profile_image', ''),
			COALESCE(to_jsonb(s)->>'data_university', to_jsonb(s)->>'university', ''),
			COALESCE(to_jsonb(s)->'items', '[]'::jsonb),
			COALESCE(to_jsonb(s)->'histories', '[]'::jsonb)
		FROM "sectionMeta" sm
		LEFT JOIN "sections" s ON (
			s.id = sm.id
			OR s.id = COALESCE(NULLIF(to_jsonb(sm)->>'section_id', ''), NULLIF(to_jsonb(sm)->>'sectionId', ''), NULLIF(to_jsonb(sm)->>'sectionid', ''))
		)
		ORDER BY COALESCE(NULLIF(to_jsonb(sm)->>'order', '')::int, 0) ASC
	`)
	if err != nil {
		log.Printf("getSections query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch sections"})
		return
	}
	defer rows.Close()

	sections := make([]section, 0)
	for rows.Next() {
		var s section
		var rawData, rawItems, rawHistories []byte
		var dataName, dataHometown, dataHobbies, dataProfileImage, dataUniversity string
		if err := rows.Scan(
			&s.ID,
			&s.Meta.DisplayName,
			&s.Meta.Type,
			&s.Meta.Order,
			&s.Meta.Editable,
			&s.Meta.SortOrder,
			&rawData,
			&dataName,
			&dataHometown,
			&dataHobbies,
			&dataProfileImage,
			&dataUniversity,
			&rawItems,
			&rawHistories,
		); err != nil {
			log.Printf("getSections scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch sections"})
			return
		}
		s.Meta.Type = normalizeSectionType(s.Meta.Type)
		s.Data = json.RawMessage(buildSectionData(rawData, rawItems, rawHistories, s.Meta.Type, dataName, dataHometown, dataHobbies, dataProfileImage, dataUniversity))
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

	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}
	defer tx.Rollback(r.Context())

	var exists bool
	if err := tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM "sectionMeta" WHERE id=$1)`, body.ID).Scan(&exists); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}
	if exists {
		writeJSON(w, http.StatusConflict, map[string]any{"error": "Section with this ID already exists"})
		return
	}

	orderNo := 0
	if body.Order != nil {
		orderNo = *body.Order
	} else {
		_ = tx.QueryRow(r.Context(), `SELECT COALESCE(MAX("order"),0)+1 FROM "sectionMeta"`).Scan(&orderNo)
	}

	_, err = tx.Exec(r.Context(), `
		INSERT INTO "sectionMeta" (id, section_id, "displayName", type_name, "order", editable)
		VALUES ($1,$1,$2,$3,$4,true)
	`, body.ID, body.DisplayName, body.Type, orderNo)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}

	_, err = tx.Exec(r.Context(), `INSERT INTO "sections" (id, type_name, data) VALUES ($1, $2, $3::jsonb)`, body.ID, body.Type, string(body.Data))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}

	h.logAdmin(r.Context(), "create", "section", body.ID, "info", user, map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": orderNo})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Section created successfully", "section": map[string]any{"id": body.ID, "meta": map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": orderNo, "editable": true, "sortOrder": body.SortOrder}, "data": json.RawMessage(body.Data)}})
}

func (h *Handler) updateSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	b, _ := json.Marshal(patch)
	cmd, err := h.store.Pool.Exec(r.Context(), `
		UPDATE "sections" SET data = COALESCE(data,'{}'::jsonb) || $2::jsonb WHERE id=$1
	`, id, string(b))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update section"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
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
	setClauses := make([]string, 0)
	args := make([]any, 0)
	idx := 1
	for k, v := range patch {
		sqlCol := ""
		switch k {
		case "displayName":
			sqlCol = `"displayName"`
		case "type":
			sqlCol = "type_name"
		case "order":
			sqlCol = `"order"`
		case "editable":
			sqlCol = "editable"
		case "sortOrder":
			sqlCol = ""
		}
		if sqlCol == "" {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s=$%d", sqlCol, idx))
		args = append(args, v)
		idx++
	}
	if len(setClauses) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
		return
	}
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE "sectionMeta" SET %s WHERE id=$%d`, strings.Join(setClauses, ","), idx)
	cmd, err := h.store.Pool.Exec(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update section meta"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "sectionMeta", id, "info", user, map[string]any{"updates": patch})
	writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
}

func (h *Handler) deleteSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete section"})
		return
	}
	defer tx.Rollback(r.Context())
	_, _ = tx.Exec(r.Context(), `DELETE FROM "sections" WHERE id=$1`, id)
	cmd, err := tx.Exec(r.Context(), `DELETE FROM "sectionMeta" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete section"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete section"})
		return
	}
	h.logAdmin(r.Context(), "delete", "section", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Section deleted successfully"})
}

// activities and categories
