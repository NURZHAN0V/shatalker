package ws

import "testing"

func TestOriginAllowed(t *testing.T) {
	want := "http://localhost:5173"
	if !originAllowed("http://localhost:5173", want) {
		t.Fatal("same origin")
	}
	if !originAllowed("http://localhost:5173/", want) {
		t.Fatal("trailing slash")
	}
	if originAllowed("", want) {
		t.Fatal("empty origin")
	}
	if originAllowed("http://evil.example", want) {
		t.Fatal("foreign origin")
	}
	if originAllowed("https://localhost:5173", want) {
		t.Fatal("scheme mismatch")
	}
}
