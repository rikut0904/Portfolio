package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strings"
	"time"

	"portfolio-backend/internal/auth"
)

const maxImageUploadBytes = 10 << 20 // 10MB

var unsafeFileChars = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func sanitizeFileName(name string) string {
	fileName := strings.TrimSpace(name)
	fileName = strings.ReplaceAll(fileName, " ", "_")
	fileName = unsafeFileChars.ReplaceAllString(fileName, "")
	return fileName
}

func resolveUploadDir(v string) (repoDir string, publicDir string, err error) {
	switch strings.TrimSpace(v) {
	case "product":
		return "product", "/img/product", nil
	case "profile":
		return "", "/img", nil
	case "other":
		return "other", "/img/other", nil
	default:
		return "", "", fmt.Errorf("invalid upload path")
	}
}

func githubPathEscape(fullPath string) string {
	parts := strings.Split(fullPath, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return strings.Join(parts, "/")
}

func (h *Handler) uploadImage(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if h.githubToken == "" || h.githubOwner == "" || h.githubRepo == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "GitHub upload is not configured"})
		return
	}

	if err := r.ParseMultipartForm(maxImageUploadBytes + (1 << 20)); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid multipart form"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "No file provided"})
		return
	}
	defer file.Close()

	repoDir, publicDir, err := resolveUploadDir(r.FormValue("path"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid upload path"})
		return
	}

	fileName := sanitizeFileName(header.Filename)
	if fileName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid file name"})
		return
	}

	raw, err := io.ReadAll(io.LimitReader(file, maxImageUploadBytes+1))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Failed to read file"})
		return
	}
	if int64(len(raw)) > maxImageUploadBytes {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]any{"error": "File too large (max 10MB)"})
		return
	}

	detected := http.DetectContentType(raw)
	if !strings.HasPrefix(detected, "image/") {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Only image files are allowed"})
		return
	}

	repoPath := path.Join("public", "img", repoDir, fileName)
	publicPath := path.Join(publicDir, fileName)
	if !strings.HasPrefix(publicPath, "/") {
		publicPath = "/" + publicPath
	}

	exists, err := h.githubFileExists(r.Context(), repoPath)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to check existing file"})
		return
	}
	if exists {
		writeJSON(w, http.StatusConflict, map[string]any{
			"error": "File already exists",
			"path":  publicPath,
		})
		return
	}

	sha, err := h.githubPutFile(r.Context(), repoPath, fileName, raw)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to upload image to GitHub"})
		return
	}

	h.logAdmin(r.Context(), "upload", "image", "", "info", user, map[string]any{
		"path":     publicPath,
		"fileName": fileName,
		"status":   "uploaded",
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"success":  true,
		"path":     publicPath,
		"fileName": fileName,
		"sha":      sha,
	})
}

func (h *Handler) githubFileExists(ctx context.Context, repoPath string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	endpoint := fmt.Sprintf(
		"https://api.github.com/repos/%s/%s/contents/%s?ref=%s",
		url.PathEscape(h.githubOwner),
		url.PathEscape(h.githubRepo),
		githubPathEscape(repoPath),
		url.QueryEscape(h.githubBranch),
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+h.githubToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	res, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return false, err
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusOK {
		return true, nil
	}
	if res.StatusCode == http.StatusNotFound {
		return false, nil
	}
	body, _ := io.ReadAll(io.LimitReader(res.Body, 4<<10))
	return false, fmt.Errorf("github get content failed: status=%d body=%s", res.StatusCode, strings.TrimSpace(string(body)))
}

func (h *Handler) githubPutFile(ctx context.Context, repoPath, fileName string, data []byte) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	payload := map[string]any{
		"message": fmt.Sprintf("Upload image: %s", fileName),
		"content": base64.StdEncoding.EncodeToString(data),
		"branch":  h.githubBranch,
	}
	body, _ := json.Marshal(payload)

	endpoint := fmt.Sprintf(
		"https://api.github.com/repos/%s/%s/contents/%s",
		url.PathEscape(h.githubOwner),
		url.PathEscape(h.githubRepo),
		githubPathEscape(repoPath),
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, endpoint, strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+h.githubToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("Content-Type", "application/json")

	res, err := (&http.Client{Timeout: 20 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	respRaw, _ := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if res.StatusCode != http.StatusCreated && res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github put content failed: status=%d body=%s", res.StatusCode, strings.TrimSpace(string(respRaw)))
	}

	var resp struct {
		Content struct {
			SHA string `json:"sha"`
		} `json:"content"`
	}
	_ = json.Unmarshal(respRaw, &resp)
	return strings.TrimSpace(resp.Content.SHA), nil
}
