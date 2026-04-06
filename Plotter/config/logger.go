// config/logger.go
package config

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// InitLogger initializes a zap logger based on the application configuration
func InitLogger(cfg *AppConfig) (*zap.Logger, error) {
	// Determine log level from configuration
	logLevel := parseLogLevel(cfg.Server.LogLevel)

	// Configure encoder (pretty print for development, JSON for production)
	var encoderConfig zapcore.EncoderConfig
	var encoder zapcore.Encoder

	if cfg.Server.GinMode == "debug" {
		encoderConfig = zap.NewDevelopmentEncoderConfig()
		encoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		encoder = zapcore.NewConsoleEncoder(encoderConfig)
	} else {
		encoderConfig = zap.NewProductionEncoderConfig()
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		encoder = zapcore.NewJSONEncoder(encoderConfig)
	}

	// Configure output (stdout)
	writer := zapcore.AddSync(os.Stdout)

	// Create core
	core := zapcore.NewCore(encoder, writer, logLevel)

	// Build logger with caller info
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	return logger, nil
}

// parseLogLevel converts string log level to zapcore.Level
func parseLogLevel(level string) zapcore.Level {
	switch level {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn", "warning":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	case "fatal":
		return zapcore.FatalLevel
	default:
		return zapcore.InfoLevel
	}
}

// Global logger instance (will be set in main.go)
var Logger *zap.Logger

// GetLogger returns the global logger instance
func GetLogger() *zap.Logger {
	if Logger == nil {
		// Fallback to a basic logger if not initialized
		Logger, _ = zap.NewProduction()
	}
	return Logger
}

// SetLogger sets the global logger instance
func SetLogger(logger *zap.Logger) {
	Logger = logger
}
