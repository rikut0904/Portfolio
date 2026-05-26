package inquiry

type Inquiry struct {
	ID           string `json:"id"`
	ThreadID     string `json:"threadId"`
	Category     string `json:"category"`
	Subject      string `json:"subject"`
	Message      string `json:"message"`
	ContactName  string `json:"contactName"`
	ContactEmail string `json:"contactEmail"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type Reply struct {
	ID          string `json:"id"`
	InquiryID   string `json:"inquiryId"`
	ThreadID    string `json:"threadId"`
	SenderType  string `json:"senderType"`
	SenderName  string `json:"senderName"`
	SenderEmail string `json:"senderEmail"`
	Message     string `json:"message"`
	CreatedAt   string `json:"createdAt"`
}

type InquiryPayload struct {
	Category       string `json:"category"`
	Subject        string `json:"subject"`
	Message        string `json:"message"`
	ContactName    string `json:"contactName"`
	ContactEmail   string `json:"contactEmail"`
	RequestedStart string `json:"requestedStart"`
	RequestedEnd   string `json:"requestedEnd"`
}

type InquiryReplyPayload struct {
	Message string `json:"message"`
}
