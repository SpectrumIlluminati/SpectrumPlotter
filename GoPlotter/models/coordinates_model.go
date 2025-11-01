// models/coordinates_model.go
package models

type Coordinate struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type DMSCoordinate struct {
	Degrees   int     `json:"degrees"`
	Minutes   int     `json:"minutes"`
	Seconds   float64 `json:"seconds"`
	Direction string  `json:"direction"`
}

type CoordinateResponse struct {
	Decimal string `json:"decimal"`
	DMS     string `json:"dms"`
	Compact string `json:"compact"`
}
