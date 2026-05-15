package migrations

import (
	"log"
	"gorm.io/gorm"
	"fmt"
)

// RunOneTimeRefactoring migrations should only be called once or as part of a dedicated migration process.
// It contains destructive operations like column dropping and renaming.
func RunOneTimeRefactoring(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		m := tx.Migrator()

		// 1. Rename Tables BACK to PascalCase if snake_case exists (Safety for transition)
		tableRenames := map[string]string{
			"activity_categories": "activityCategories",
			"admin_logs":          "adminLogs",
			"section_meta":        "sectionMeta",
		}
		for snakeName, pascalName := range tableRenames {
			if m.HasTable(snakeName) {
				if !m.HasTable(pascalName) {
					log.Printf("Renaming table %s back to %s", snakeName, pascalName)
					if err := m.RenameTable(snakeName, pascalName); err != nil {
						return fmt.Errorf("failed to rename table %s: %w", snakeName, err)
					}
				} else {
					log.Printf("Dropping redundant snake_case table %s", snakeName)
					m.DropTable(snakeName)
				}
			}
		}

		// 2. Rename Columns BACK to PascalCase if they exist
		columnRenames := map[string]map[string]string{
			"products": {
				"github_url": "githubUrl",
				"deploy_status": "deployStatus",
				"created_year": "createdYear",
				"created_month": "createdMonth",
				"created_at": "createdAt",
				"updated_at": "updatedAt",
			},
			"activities": {
				"order_no": "order",
				"created_at": "createdAt",
				"updated_at": "updatedAt",
			},
		}
		for table, renames := range columnRenames {
			if m.HasTable(table) {
				for snakeCol, pascalCol := range renames {
					if m.HasColumn(table, snakeCol) && !m.HasColumn(table, pascalCol) {
						log.Printf("Renaming column %s.%s back to %s", table, snakeCol, pascalCol)
						if err := m.RenameColumn(table, snakeCol, pascalCol); err != nil {
							log.Printf("Warning: failed to rename column %s.%s: %v", table, snakeCol, err)
						}
					}
				}
			}
		}

		// 3. Section Data Consolidation and Cleanup
		if m.HasTable("sections") {
			if m.HasColumn("sections", "data_name") {
				log.Println("Consolidating profile data and dropping old columns...")
				tx.Exec(`UPDATE sections SET 
					data = data || jsonb_build_object(
						'name', CASE WHEN "data_name" <> '' THEN "data_name" ELSE COALESCE(data->>'name', '') END,
						'hometown', CASE WHEN "data_hometown" <> '' THEN "data_hometown" ELSE COALESCE(data->>'hometown', '') END,
						'hobbies', CASE WHEN "data_hobbies" <> '' THEN "data_hobbies" ELSE COALESCE(data->>'hobbies', '') END,
						'profileImage', CASE WHEN "data_profileImage" <> '' THEN "data_profileImage" ELSE COALESCE(data->>'profileImage', '') END,
						'university', CASE WHEN "data_university" <> '' THEN "data_university" ELSE COALESCE(data->>'university', '') END
					)
					WHERE type_name IN ('profile', 'single') OR "data_name" <> ''`)

				cols := []string{"data_name", "data_hometown", "data_hobbies", "data_profileImage", "data_university"}
				for _, c := range cols {
					m.DropColumn("sections", c)
				}
			}

			// Unify affiliation and remove university key from JSON
			tx.Exec(`UPDATE sections SET 
				data = (data - 'university') || jsonb_build_object(
					'affiliation', COALESCE(NULLIF(data->>'affiliation', ''), data->>'university', '')
				)
				WHERE id = 'profile'`)

			// Enforce data integrity
			tx.Exec(`UPDATE sections SET items = '[]', histories = '[]' WHERE type_name IN ('profile', 'single')`)
			tx.Exec(`UPDATE sections SET data = '{}', histories = '[]' WHERE type_name IN ('list', 'categorized')`)
			tx.Exec(`UPDATE sections SET 
				histories = CASE WHEN (histories = '[]' OR histories IS NULL) AND (items <> '[]' AND items IS NOT NULL) THEN items ELSE histories END,
				data = '{}'
				WHERE type_name = 'history' OR id LIKE '%History'`)
			tx.Exec(`UPDATE sections SET items = '[]' WHERE type_name = 'history' OR id LIKE '%History'`)
		}

		// 4. Activity/Product Image Path Cleanup
		if m.HasTable("activities") {
			tx.Exec(`UPDATE activities SET image = '' WHERE image = '/img/activity/' OR image IS NULL`)
		}
		if m.HasTable("products") {
			tx.Exec(`UPDATE products SET image = '' WHERE image = '/img/product/' OR image IS NULL`)
		}

		return nil
	})
}
