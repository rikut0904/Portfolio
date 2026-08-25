package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/config"
	"portfolio-backend/internal/infrastructure/persistence/postgres"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const mockTimestamp = "2026-01-01T00:00:00Z"

func main() {
	log.Println("Starting anonymous mock data insertion...")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}
	if err := validateLocalDatabaseURL(cfg.DatabaseURL); err != nil {
		log.Fatalf("refusing to run mocks: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	store, err := postgres.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer store.Close()

	if err := insertMocks(ctx, store.DB); err != nil {
		log.Fatalf("mock data insertion failed: %v", err)
	}
	log.Println("Anonymous mock data inserted successfully.")
}

func validateLocalDatabaseURL(databaseURL string) error {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return fmt.Errorf("invalid DATABASE_URL: %w", err)
	}
	host := strings.ToLower(parsed.Hostname())
	switch host {
	case "postgres", "postgres-ci", "localhost", "127.0.0.1", "::1":
		return nil
	default:
		return fmt.Errorf("DATABASE_URL host %q is not a local database; use postgres, postgres-ci, or localhost", host)
	}
}

func insertMocks(ctx context.Context, db *gorm.DB) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := removePreviousMockRows(tx); err != nil {
			return err
		}
		if err := upsertSections(tx); err != nil {
			return err
		}
		if err := upsertProducts(tx); err != nil {
			return err
		}
		if err := upsertActivities(tx); err != nil {
			return err
		}
		if err := upsertTechnologies(tx); err != nil {
			return err
		}
		return upsertInquiries(tx)
	})
}

func removePreviousMockRows(tx *gorm.DB) error {
	for _, model := range []any{
		&postgres.InquiryReplyModel{},
		&postgres.SectionDataModel{},
		&postgres.ProductModel{},
		&postgres.ActivityModel{},
		&postgres.ActivityCategoryModel{},
		&postgres.TechnologyModel{},
	} {
		if err := deleteMockRows(tx, model); err != nil {
			return err
		}
	}

	var inquiryIDs []string
	if err := tx.Model(&postgres.InquiryModel{}).
		Where("contact_email = ? AND subject = ?", "demo@example.invalid", "サンプルお問い合わせ").
		Pluck("id", &inquiryIDs).Error; err != nil {
		return err
	}
	if len(inquiryIDs) > 0 {
		if err := tx.Where("inquiry_id IN ?", inquiryIDs).Delete(&postgres.InquiryReplyModel{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id IN ?", inquiryIDs).Delete(&postgres.InquiryModel{}).Error; err != nil {
			return err
		}
	}
	return nil
}

func deleteMockRows(tx *gorm.DB, model any) error {
	return tx.Where("id LIKE ?", "mock-%").Delete(model).Error
}

func upsertSections(tx *gorm.DB) error {
	rows := []postgres.SectionDataModel{
		{ID: "mock-profile", DisplayName: "プロフィール", TypeName: "single", Order: 1, Editable: true, Data: jsonData(`{"name":"サンプルユーザー","from":"サンプル地域","hobbies":"読書、温泉巡り","hometown":"サンプル市","affiliation":"サンプル大学 情報系学科","imageUrl":"/img/profile.jpg","profileImage":"/img/profile.jpg"}`), Items: jsonData(`[]`), Histories: jsonData(`[]`)},
		{ID: "mock-specializations", DisplayName: "専門領域", TypeName: "categorized", Order: 2, Editable: true, Data: jsonData(`{}`), Items: jsonData(`[ {"title":"情報工学","items":["システム開発","データベース"]}, {"title":"電気工学","items":["電気工事"]}]`), Histories: jsonData(`[]`)},
		{ID: "mock-school-history", DisplayName: "学歴", TypeName: "history", Order: 4, Editable: true, Data: jsonData(`{}`), Items: jsonData(`[]`), Histories: jsonData(`[ {"date":"2021年04月","details":["サンプル高等学校 電気系学科 入学"]}, {"date":"2024年03月","details":["サンプル高等学校 電気系学科 卒業"]}, {"date":"2024年04月","details":["サンプル大学 情報系学科 入学"]}, {"date":"2028年03月","details":["サンプル大学 情報系学科 卒業予定"]} ]`)},
		{ID: "mock-community-history", DisplayName: "団体参加履歴", TypeName: "history", Order: 5, Editable: true, Data: jsonData(`{}`), Items: jsonData(`[]`), Histories: jsonData(`[ {"date":"2024年04月","details":["A 参加","B 参加","C 参加"]}, {"date":"2024年07月","details":["D 参加"]}]`)},
	}
	return upsert(tx, rows, []string{"displayName", "typeName", "order", "editable", "data", "items", "histories"})
}

func upsertProducts(tx *gorm.DB) error {
	rows := []postgres.ProductModel{
		{ID: "mock-product-memories", Title: "思い出記録アプリ", Description: "旅行の思い出を記録するためのサンプルアプリケーションです。", Image: "/img/product/omoide-memoria.png", Link: "https://example.com/memories", GithubURL: "https://github.com/example/memories", Category: "Webアプリケーション", Technologies: jsonData(`["Docker","Go","Next.js","TypeScript","PostgreSQL","Vercel"]`), Status: "公開", DeployStatus: "公開中", CreatedYear: 2026, CreatedMonth: 2, CreatedAt: mockTimestamp, UpdatedAt: mockTime()},
		{ID: "mock-product-gpa", Title: "GPA計算システム", Description: "成績を入力してGPAを計算するサンプルシステムです。", Image: "/img/product/GPA_calc.jpg", Link: "", GithubURL: "https://github.com/example/gpa-calculator", Category: "デスクトップアプリ", Technologies: jsonData(`["Python","Firebase"]`), Status: "公開", DeployStatus: "未公開", CreatedYear: 2024, CreatedMonth: 8, CreatedAt: mockTimestamp, UpdatedAt: mockTime()},
	}
	return upsert(tx, rows, []string{"title", "description", "image", "link", "githubUrl", "category", "technologies", "status", "deployStatus", "createdYear", "createdMonth", "createdAt", "updatedAt"})
}

func upsertActivities(tx *gorm.DB) error {
	rows := []postgres.ActivityModel{
		{ID: "mock-activity-a", Title: "A", Description: "", Category: "アルバイト", Link: "https://example.com/activity/learning-support", Status: "公開", Order: 1, CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-activity-b", Title: "B", Description: "", Category: "参加コミュニティ", Link: "https://example.com/activity/it-community", Status: "公開", Order: 1, CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-activity-c", Title: "C", Description: "", Category: "その他大学課外活動", Link: "https://example.com/activity/festival", Status: "公開", Order: 1, CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-activity-d", Title: "D", Description: "", Category: "大学外課外活動", Link: "https://example.com/activity/community-project", Status: "公開", Order: 1, CreatedAt: mockTime(), UpdatedAt: mockTime()},
	}
	if err := upsert(tx, rows, []string{"title", "description", "category", "link", "image", "status", "order", "updatedAt"}); err != nil {
		return err
	}
	return upsert(tx, []postgres.ActivityCategoryModel{
		{ID: "mock-category-project", Name: "プロジェクト", Order: 1, CreatedAt: mockTime()},
		{ID: "mock-category-campus", Name: "その他大学課外活動", Order: 2, CreatedAt: mockTime()},
		{ID: "mock-category-outside", Name: "大学外課外活動", Order: 3, CreatedAt: mockTime()},
		{ID: "mock-category-job", Name: "アルバイト", Order: 4, CreatedAt: mockTime()},
		{ID: "mock-category-community", Name: "参加コミュニティ", Order: 5, CreatedAt: mockTime()},
	}, []string{"name", "order"})
}

func upsertTechnologies(tx *gorm.DB) error {
	rows := []postgres.TechnologyModel{
		{ID: "mock-tech-auth0", Name: "Auth0", Category: "ツール", CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-tech-docker", Name: "Docker", Category: "ツール", CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-tech-firebase", Name: "Firebase", Category: "クラウド・インフラ", CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-tech-go", Name: "Go", Category: "プログラミング言語", CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-tech-postgres", Name: "Postgres SQL", Category: "データベース", CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-tech-railway", Name: "Railway", Category: "クラウド・インフラ", CreatedAt: mockTime(), UpdatedAt: mockTime()},
		{ID: "mock-tech-redis", Name: "Redis", Category: "データベース", CreatedAt: mockTime(), UpdatedAt: mockTime()},
	}
	return upsert(tx, rows, []string{"name", "category", "updatedAt"})
}

func upsertInquiries(tx *gorm.DB) error {
	inquiryID := uuid.NewString()
	threadID := "mock-thread-" + uuid.NewString()
	inquiry := postgres.InquiryModel{
		ID: inquiryID, ThreadID: threadID,
		Category: "general", Subject: "サンプルお問い合わせ", Message: "これは画面確認用の匿名サンプルお問い合わせです。",
		ContactName: "匿名ユーザー", ContactEmail: "demo@example.invalid", Status: "pending", CreatedAt: mockTime(), UpdatedAt: mockTime(),
	}
	if err := upsert(tx, []postgres.InquiryModel{inquiry}, []string{"thread_id", "category", "subject", "message", "contact_name", "contact_email", "status", "updatedAt"}); err != nil {
		return err
	}
	reply := postgres.InquiryReplyModel{
		ID: uuid.NewString(), InquiryID: inquiry.ID, ThreadID: inquiry.ThreadID,
		SenderType: "admin", SenderName: "管理者サンプル", SenderEmail: "admin@example.invalid", Message: "サンプル返信です。", CreatedAt: mockTime(),
	}
	return upsert(tx, []postgres.InquiryReplyModel{reply}, []string{"inquiry_id", "thread_id", "sender_type", "sender_name", "sender_email", "message"})
}

func upsert[T any](tx *gorm.DB, rows []T, columns []string) error {
	if len(rows) == 0 {
		return nil
	}
	return tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns(columns),
	}).Create(&rows).Error
}

func jsonData(value string) json.RawMessage { return json.RawMessage(value) }

func mockTime() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }
