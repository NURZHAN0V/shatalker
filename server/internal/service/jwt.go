package service

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type claims struct {
	jwt.RegisteredClaims
	UserID int64 `json:"uid"`
}

func (s *Service) signToken(userID int64) (string, error) {
	now := time.Now()
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)),
		},
		UserID: userID,
	})
	return t.SignedString(s.jwtSecret)
}

func (s *Service) ParseToken(token string) (int64, error) {
	parsed, err := jwt.ParseWithClaims(token, &claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, ErrUnauthorized
		}
		return s.jwtSecret, nil
	})
	if err != nil || !parsed.Valid {
		return 0, ErrUnauthorized
	}
	c, ok := parsed.Claims.(*claims)
	if !ok || c.UserID == 0 {
		return 0, ErrUnauthorized
	}
	return c.UserID, nil
}
