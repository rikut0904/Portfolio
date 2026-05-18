package v2

import (
	productusecase "portfolio-backend/internal/usecase/product"
)

type ProductHandler struct {
	usecase productusecase.Usecase
}
