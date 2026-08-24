package section

import "encoding/json"

type SectionMeta struct {
	ID          string `json:"id"`
	SectionID   string `json:"sectionId"`
	DisplayName string `json:"displayName"`
	TypeName    string `json:"type"`
	Order       int    `json:"order"`
	Editable    bool   `json:"editable"`
}
type SectionData struct {
	ID        string          `json:"id"`
	TypeName  string          `json:"typeName"`
	Data      json.RawMessage `json:"data"`
	Items     json.RawMessage `json:"items"`
	Histories json.RawMessage `json:"histories"`
}
type Section struct {
	ID   string          `json:"id"`
	Meta SectionMeta     `json:"meta"`
	Data json.RawMessage `json:"data"`
}
type SectionPayload struct {
	ID          string          `json:"id"`
	DisplayName string          `json:"displayName"`
	TypeName    string          `json:"typeName"`
	Order       *int            `json:"order"`
	Data        json.RawMessage `json:"data"`
}
