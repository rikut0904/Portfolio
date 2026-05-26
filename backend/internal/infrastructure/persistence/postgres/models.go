package postgres

import (
	"encoding/json"
	"time"
)

type ProductModel struct {
	ID           string          `gorm:"primaryKey;column:id"`
	Title        string          `gorm:"column:title;not null"`
	Description  string          `gorm:"column:description;not null"`
	Image        string          `gorm:"column:image;not null;default:''"`
	Link         string          `gorm:"column:link;not null;default:''"`
	GithubURL    string          `gorm:"column:githubUrl;not null;default:''"`
	Category     string          `gorm:"column:category;not null;default:''"`
	Technologies json.RawMessage `gorm:"column:technologies;type:jsonb;not null;default:'[]'"`
	Status       string          `gorm:"column:status;not null;default:'公開'"`
	DeployStatus string          `gorm:"column:deployStatus;not null;default:'未公開'"`
	CreatedYear  int             `gorm:"column:createdYear;not null"`
	CreatedMonth int             `gorm:"column:createdMonth;not null"`
	CreatedAt    string          `gorm:"column:createdAt;not null"`
	UpdatedAt    time.Time       `gorm:"column:updatedAt;not null"`
}

func (ProductModel) TableName() string {
	return "products"
}

type ActivityModel struct {
	ID          string    `gorm:"primaryKey;column:id"`
	Title       string    `gorm:"column:title;not null"`
	Description string    `gorm:"column:description;not null;default:''"`
	Category    string    `gorm:"column:category;not null"`
	Link        string    `gorm:"column:link;not null;default:''"`
	Image       string    `gorm:"column:image;not null;default:''"`
	Status      string    `gorm:"column:status;not null;default:'非公開'"`
	Order       int       `gorm:"column:order;not null;default:0"`
	CreatedAt   time.Time `gorm:"column:createdAt;autoCreateTime"`
	UpdatedAt   time.Time `gorm:"column:updatedAt;autoUpdateTime"`
}

func (ActivityModel) TableName() string {
	return "activities"
}

type ActivityCategoryModel struct {
	ID        string    `gorm:"primaryKey;column:id"`
	Name      string    `gorm:"column:name;uniqueIndex;not null"`
	Order     int       `gorm:"column:order;not null;default:0"`
	CreatedAt time.Time `gorm:"column:createdAt;autoCreateTime"`
}

func (ActivityCategoryModel) TableName() string {
	return "activityCategories"
}

type TechnologyModel struct {
	ID        string    `gorm:"primaryKey;column:id"`
	Name      string    `gorm:"column:name;uniqueIndex;not null"`
	Category  string    `gorm:"column:category;not null;default:''"`
	CreatedAt time.Time `gorm:"column:createdAt;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updatedAt;autoUpdateTime"`
}

func (TechnologyModel) TableName() string {
	return "technologies"
}

type InquiryModel struct {
	ID           string    `gorm:"primaryKey;column:id;default:gen_random_uuid()"`
	Category     string    `gorm:"column:category;not null;default:''"`
	Subject      string    `gorm:"column:subject;not null"`
	Message      string    `gorm:"column:message;not null"`
	ContactName  string    `gorm:"column:contact_name;not null;default:''"`
	ContactEmail string    `gorm:"column:contact_email;not null"`
	ThreadID     string    `gorm:"column:thread_id;uniqueIndex;not null;default:gen_random_uuid()"`
	Status       string    `gorm:"column:status;not null;default:'pending'"`
	CreatedAt    time.Time `gorm:"column:createdAt;autoCreateTime"`
	UpdatedAt    time.Time `gorm:"column:updatedAt;autoUpdateTime"`
}

func (InquiryModel) TableName() string {
	return "inquiries"
}

type InquiryReplyModel struct {
	ID          string       `gorm:"primaryKey;column:id;default:gen_random_uuid()"`
	InquiryID   string       `gorm:"column:inquiry_id;not null;index"`
	Inquiry     InquiryModel `gorm:"foreignKey:InquiryID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	ThreadID    string       `gorm:"column:thread_id;not null;index"`
	SenderType  string       `gorm:"column:sender_type;not null"`
	SenderName  string       `gorm:"column:sender_name;not null;default:''"`
	SenderEmail string       `gorm:"column:sender_email;not null;default:''"`
	Message     string       `gorm:"column:message;not null"`
	CreatedAt   time.Time    `gorm:"column:createdAt;autoCreateTime"`
}

func (InquiryReplyModel) TableName() string {
	return "inquiry_replies"
}

type AdminLogModel struct {
	ID        string          `gorm:"primaryKey;column:id"`
	Action    string          `gorm:"column:action;not null"`
	Entity    *string         `gorm:"column:entity"`
	EntityID  *string         `gorm:"column:entityId"`
	UserID    *string         `gorm:"column:userId"`
	UserEmail *string         `gorm:"column:userEmail"`
	Level     string          `gorm:"column:level;not null;default:'info'"`
	Details   json.RawMessage `gorm:"column:details;type:jsonb"`
	CreatedAt time.Time       `gorm:"column:createdAt;autoCreateTime"`
}

func (AdminLogModel) TableName() string {
	return "adminLogs"
}

type SectionMetaModel struct {
	ID          string `gorm:"primaryKey;column:id"`
	SectionID   string `gorm:"column:section_id"`
	DisplayName string `gorm:"column:displayName;not null"`
	TypeName    string `gorm:"column:type_name;not null"`
	Order       int    `gorm:"column:order;not null;default:0"`
	Editable    bool   `gorm:"column:editable;not null;default:true"`
}

func (SectionMetaModel) TableName() string {
	return "sectionMeta"
}

type SectionDataModel struct {
	ID        string          `gorm:"primaryKey;column:id"`
	TypeName  string          `gorm:"column:type_name;not null"`
	Data      json.RawMessage `gorm:"column:data;type:jsonb;not null;default:'{}'"`
	Items     json.RawMessage `gorm:"column:items;type:jsonb;not null;default:'[]'"`
	Histories json.RawMessage `gorm:"column:histories;type:jsonb;not null;default:'[]'"`
}

func (SectionDataModel) TableName() string {
	return "sections"
}

type CalendarPreferenceModel struct {
	CalendarID string    `gorm:"primaryKey;column:calendar_id"`
	Color      string    `gorm:"column:color;not null"`
	Label      string    `gorm:"column:label;not null;default:''"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt  time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (CalendarPreferenceModel) TableName() string {
	return "calendar_preferences"
}

type CalendarEventPublicationModel struct {
	CalendarID        string    `gorm:"primaryKey;column:calendar_id"`
	EventID           string    `gorm:"primaryKey;column:event_id"`
	IsPublic          bool      `gorm:"column:is_public;not null;default:false"`
	PublicDescription string    `gorm:"column:public_description;not null;default:''"`
	CreatedAt         time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt         time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (CalendarEventPublicationModel) TableName() string {
	return "calendar_event_publications"
}

type SystemSettingModel struct {
	Key       string    `gorm:"primaryKey;column:key"`
	Value     string    `gorm:"column:value;not null"`
	UpdatedAt time.Time `gorm:"column:updatedAt;autoUpdateTime"`
}

func (SystemSettingModel) TableName() string {
	return "systemSettings"
}

// GetModels returns a slice of all GORM models for AutoMigrate.
func GetModels() []any {
	return []any{
		&ProductModel{},
		&ActivityModel{},
		&ActivityCategoryModel{},
		&TechnologyModel{},
		&InquiryModel{},
		&InquiryReplyModel{},
		&AdminLogModel{},
		&SectionMetaModel{},
		&SectionDataModel{},
		&CalendarPreferenceModel{},
		&CalendarEventPublicationModel{},
		&SystemSettingModel{},
	}
}
