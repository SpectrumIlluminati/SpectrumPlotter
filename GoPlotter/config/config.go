package config

import (
	"fmt"
)

type Config struct {
	DatabaseURL string
	Port        string
	Host        string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
}

func Load() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgresql17"),
		Port:        getEnv("PORT", "8080"),
		Host:        getEnv("HOST", "jelly"),
		DBHost:      getEnv("DB_HOST", "jelly"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "freqman"),
		DBPassword:  getEnv("DB_PASSWORD", "3h0MX!21dZjQ1T"),
		DBName:      getEnv("DB_NAME", "freqnom_DB"),
	}
}

func (c *Config) GetDatabaseURL() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}

	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName)
}
