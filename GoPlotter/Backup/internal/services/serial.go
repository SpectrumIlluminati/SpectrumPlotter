// services/serial.go
package services

import (
    "fmt"
    "sync"
)

type SerialService struct {
    counter int
    mutex   sync.Mutex
}

func NewSerialService() *SerialService {
    return &SerialService{counter: 1}
}

func (ss *SerialService) GenerateSerial() string {
    ss.mutex.Lock()
    defer ss.mutex.Unlock()
    
    serial := fmt.Sprintf("FREQ%06d", ss.counter)
    ss.counter++
    return serial
}