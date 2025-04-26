# Certificate Management System Tests

Copyright (c) 2025 ogt11.com, llc

## Test Suite Overview

This directory contains various tests for the certificate management system:

### Stress Tests
- `stress-test.sh`: Generates and submits multiple certificate requests in parallel
  - Generates unique CSRs with random but realistic data
  - Tests system under load with parallel requests
  - Validates system stability and performance
  - Configuration: 2000 requests, 10 parallel connections

### Search Tests
- `search-test.sh`: Validates certificate search and uniqueness constraints
  - Tests version-based searching
  - Validates domain-based filtering
  - Checks username patterns
  - Verifies fingerprint uniqueness
  - Tests email uniqueness within versions

## Running Tests

1. Ensure services are running:
```bash
# Terminal 1
cd cert-admin && npm start

# Terminal 2
cd cert-create && npm start
```

2. Run stress test:
```bash
./tests/stress-test.sh
```

3. Run search validation:
```bash
./tests/search-test.sh
```

## Test Categories

- **Load Testing**: Stress tests to verify system performance
- **Data Validation**: Checks for data integrity and uniqueness
- **API Testing**: Validates API endpoints and responses
- **Version Tracking**: Ensures proper version tagging and tracking

## Adding New Tests

When adding new tests:
1. Create test script in appropriate category
2. Add documentation to this README
3. Ensure proper error handling and cleanup
4. Include copyright notice in test files 