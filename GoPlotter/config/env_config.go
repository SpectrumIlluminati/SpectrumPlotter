package config

import "os"

// GetEnv retrieves an environment variable with a default fallback value
func GetEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
