package model

import (
	"regexp"
	"strings"
)

var nonAlphaNumRegex = regexp.MustCompile(`[^a-z0-9]+`)

func ToSlug(s string) string {
	str := strings.ToLower(strings.TrimSpace(s))
	str = nonAlphaNumRegex.ReplaceAllString(str, "-")
	return strings.Trim(str, "-")
}
