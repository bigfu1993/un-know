# Backend Reference

## Scope

Applies to `server/src/main/java`, `server/src/main/resources/db/migration`, backend docs, and runtime API validation.

## Java Project Structure

- `controller`: HTTP boundary only. Validate request body, read path/query/header values, call an application service, return `ApiResponse`.
- `application`: transaction and business orchestration. Keep controller logic out of this layer.
- `model`: request/response records, enums, and business constants that are part of an API or domain contract.
- `common`: cross-module API envelopes, exception handling, security/session utilities.
- Prefer extracting domain constants or focused helper classes before a service becomes a string/status dumping ground.

## Comments

- JavaDoc applies to backend code as a first-class requirement.
- Add JavaDoc to public classes, records, enums, controllers, services, request/response models, exception/config classes, state constant classes, and public business methods.
- Comments should explain business intent, constraints, and non-obvious boundaries. Do not add comments that merely restate field names or simple assignments.
- Update comments in the same patch when behavior changes.

## Database And API

- Use Flyway for schema/data migrations. Do not edit migrations already applied to the database; add a higher `V*.sql`.
- Keep status strings centralized in Java constants when backend owns the state. Frontend may derive display labels but should not invent backend states.
- Use transactions for multi-step writes such as order creation, wallet freeze, quote confirmation, and status transitions.
- Throw `BusinessException` with stable error codes for expected business failures.
- Avoid logging or committing secrets. Read local database password from `.env.*.local` or environment variables.

## Runtime Validation

- Compile with `mvn -q -DskipTests compile`.
- For API/data changes, confirm `http://127.0.0.1:8080/actuator/health`.
- For changed flows, execute the shortest real API path using local H5/backend and the cloud PostgreSQL tunnel. Clean up any temporary test rows by exact ID/title.
- If Maven dependency resolution is blocked by sandbox network restrictions, rerun the same compile command with approved escalation.
