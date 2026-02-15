FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/server ./cmd/server

FROM alpine:3.21
WORKDIR /app
RUN apk --no-cache add ca-certificates
COPY --from=builder /out/server /app/server
EXPOSE 8080
CMD ["/app/server"]
