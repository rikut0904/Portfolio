package adminlog

import "encoding/json"

type AdminLog struct {
	ID        string          `json:"id"`
	Action    string          `json:"action"`
	Entity    *string         `json:"entity,omitempty"`
	EntityID  *string         `json:"entityId,omitempty"`
	UserID    *string         `json:"userId,omitempty"`
	UserEmail *string         `json:"userEmail,omitempty"`
	Level     string          `json:"level"`
	Details   json.RawMessage `json:"details"`
	CreatedAt string          `json:"createdAt"`
}
type ListInput struct {
	Limit  int
	Cursor string
}
type ListOutput struct {
	Logs       []AdminLog
	NextCursor any
}
