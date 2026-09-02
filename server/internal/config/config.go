package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Port        string
	Env         string
	DatabaseURL string
	JWTSecret   string
	CORSOrigin  string
}

func Load() Config {
	loadDotEnv(".env")
	c := Config{
		Port:        getenv("APP_PORT", "8080"),
		Env:         getenv("APP_ENV", "dev"),
		DatabaseURL: getenv("DATABASE_URL", "postgres://shatalker:shatalker@localhost:5432/shatalker?sslmode=disable"),
		JWTSecret:   getenv("JWT_SECRET", ""),
		CORSOrigin:  getenv("CORS_ORIGIN", "http://localhost:5173"),
	}
	if c.JWTSecret == "" {
		c.JWTSecret = "dev-only-change-me"
	}
	return c
}

func getenv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}

func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		_ = os.Setenv(key, val)
	}
}
