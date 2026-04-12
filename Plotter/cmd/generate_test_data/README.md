# SFAF Test Data Generator

## Overview

This utility generates **100,000 realistic SFAF records** distributed across the United States for testing and development purposes.

## Features

✅ **Geographic Distribution** - Records spread across 50 major US cities and military bases
✅ **Weighted Distribution** - Higher density in major metropolitan areas and military installations
✅ **Realistic Frequencies** - Proper frequency allocation across HF, VHF, UHF, and microwave bands
✅ **SFAF Compliance** - All records include proper MC4EB Publication 7, Change 1 fields
✅ **Performance Optimized** - Batch inserts for fast generation (~1000-2000 records/second)
✅ **Repeatable** - Consistent data generation for testing

## Geographic Coverage

### Major Cities (50 locations):
- **Northeast**: New York, Boston, Philadelphia, Washington DC
- **Southeast**: Atlanta, Miami, Charlotte, Jacksonville
- **Midwest**: Chicago, Detroit, Kansas City, Columbus
- **Southwest**: Houston, Dallas, Phoenix, Las Vegas
- **West Coast**: Los Angeles, San Francisco, Seattle, Portland

### Military Installations (Highlighted):
- Fort Bragg, NC
- Fort Campbell, KY
- Fort Hood, TX
- Eglin AFB, FL
- **Fort Walton Beach, FL** (SFAF Plotter default location - high density)
- Joint Base Lewis-McChord, WA
- Nellis AFB, NV
- Edwards AFB, CA

## Frequency Distribution

Records are distributed across realistic military frequency bands:

| Band | Frequency Range | Type | Distribution |
|------|----------------|------|--------------|
| HF | 3-30 MHz | High Frequency | 15% |
| VHF Low | 30-88 MHz | Very High Frequency | 20% |
| VHF High | 108-174 MHz | Very High Frequency | 25% |
| UHF Low | 225-400 MHz | Ultra High Frequency | 30% |
| UHF High | 400-512 MHz | Ultra High Frequency | 25% |
| L-Band | 1-2 GHz | Microwave | 10% |
| S-Band | 2-4 GHz | Microwave | 8% |
| C-Band | 4-8 GHz | Microwave | 5% |

## SFAF Fields Generated

Each record includes:
- **Field 100** - Serial Number (SFAF-000001 to SFAF-100000)
- **Field 110** - Operating Frequency (realistic MHz values)
- **Field 114** - Emission Designator (e.g., 16K0F3E, 25K0F3E)
- **Field 115** - Transmitter Power (1-100 watts)
- **Field 300** - Geographic Coordinates (lat,lng)
- **Field 340** - Equipment Type (AN/PRC-152, AN/VRC-104, etc.)
- **Field 350** - Organization (1st Infantry Division, etc.)
- **Field 400** - Date (randomized within past year)
- **Region** - CONUS (Continental United States)

## Usage

### Prerequisites:
1. PostgreSQL database running
2. SFAF Plotter database schema migrated
3. Go 1.21+ installed

### Run Generation:

```bash
# Navigate to project root
cd "z:\DriveBackup\Nerdery\SFAF Plotter\GoPlotter"

# Run the generator
go run cmd/generate_test_data/main.go
```

### Expected Output:

```
🚀 Starting test data generation...
📊 Target: 100,000 SFAF records across the United States
✅ Generated 10000 / 100000 records (1543 records/sec)
✅ Generated 20000 / 100000 records (1589 records/sec)
✅ Generated 30000 / 100000 records (1612 records/sec)
...
✅ Generated 100000 / 100000 records (1638 records/sec)
🎉 Successfully generated 100000 records in 1m1.05s
📈 Average: 1638 records/second
```

## Performance

- **Generation Speed**: ~1,500-2,000 records/second
- **Total Time**: ~50-70 seconds for 100,000 records
- **Database Size**: ~50-75 MB for 100,000 records
- **Memory Usage**: ~50-100 MB during generation

## Database Impact

### Before Generation:
```sql
SELECT COUNT(*) FROM markers;
-- 0 rows
```

### After Generation:
```sql
SELECT COUNT(*) FROM markers;
-- 100000 rows

SELECT COUNT(*) FROM sfaf_records;
-- 100000 rows
```

## Verification Queries

### Check geographic distribution:
```sql
SELECT
    SUBSTRING(notes FROM 'Test record \d+ - (.+)') as city,
    COUNT(*) as count
FROM markers
WHERE marker_type = 'imported'
GROUP BY city
ORDER BY count DESC
LIMIT 10;
```

### Check frequency distribution:
```sql
SELECT
    CASE
        WHEN CAST(frequency AS NUMERIC) < 30 THEN 'HF (3-30 MHz)'
        WHEN CAST(frequency AS NUMERIC) < 174 THEN 'VHF (30-174 MHz)'
        WHEN CAST(frequency AS NUMERIC) < 512 THEN 'UHF (225-512 MHz)'
        ELSE 'Microwave (>1 GHz)'
    END as band,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM markers WHERE marker_type = 'imported'), 2) as percentage
FROM markers
WHERE marker_type = 'imported'
GROUP BY band
ORDER BY count DESC;
```

### Check equipment distribution:
```sql
SELECT
    field_340 as equipment,
    COUNT(*) as count
FROM sfaf_records
GROUP BY field_340
ORDER BY count DESC;
```

## Cleanup

To remove all generated test data:

```sql
-- Delete all imported markers and their SFAF records (cascades)
DELETE FROM markers WHERE marker_type = 'imported';

-- Verify deletion
SELECT COUNT(*) FROM markers;
SELECT COUNT(*) FROM sfaf_records;
```

## Customization

### Adjust Record Count:
Edit `main.go` line 165:
```go
totalRecords := 100000  // Change to desired count
```

### Add More Cities:
Add to `usCities` array in `main.go`:
```go
{"City Name", lat, lng, weight, "CONUS"},
```

### Modify Frequency Bands:
Edit `frequencyBands` array to adjust distributions.

### Change Equipment Types:
Modify `equipmentTypes` array with your equipment list.

## Troubleshooting

### "Connection refused" error:
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection settings in .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sfaf_plotter
```

### "Duplicate key" error:
```bash
# Clear existing imported records first
psql -U postgres -d sfaf_plotter -c "DELETE FROM markers WHERE marker_type = 'imported';"
```

### Performance issues:
```sql
-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_markers_type ON markers(marker_type);
CREATE INDEX IF NOT EXISTS idx_markers_frequency ON markers(frequency);
CREATE INDEX IF NOT EXISTS idx_sfaf_records_marker_id ON sfaf_records(marker_id);
```

## Map Viewer Test

After generation, test the map viewer:

1. Open `http://localhost:8080/map-viewer`
2. You should see 100,000 markers distributed across the US
3. Use filters to test:
   - Frequency ranges
   - Equipment types
   - Geographic regions
   - Organizations

## Notes

- All records are marked as `marker_type = 'imported'` and `is_draggable = false`
- Serial numbers are sequential: SFAF-000001 through SFAF-100000
- Coordinates have random offsets (±27.5km) from city centers for realistic distribution
- Frequencies are realistic military allocations per band
- Power levels range from 1-100 watts (realistic for various equipment types)
- Dates are randomized within the past year

## Production Considerations

**⚠️ This is test data only**

Do NOT use this generator in production without modifications:
- Add proper serial number allocation
- Implement real frequency deconfliction
- Add spectrum management validation
- Include proper IRAC note assignments
- Validate geographic constraints
- Add equipment compatibility checks
