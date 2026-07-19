API Standards

Purpose

These standards define how the FastAPI backend exposes endpoints and how the Next.js frontend consumes them.

The goal is to keep every endpoint predictable.

Base Path

All application endpoints use the versioned prefix:

/api/v1

Examples:

GET /api/v1/todos
POST /api/v1/todos
GET /api/v1/todos/{todo_id}

Operational endpoints may remain outside the versioned API:

GET /health
GET /ready

Resource Names

Use plural nouns for resource paths.

Good:

/api/v1/todos
/api/v1/users
/api/v1/projects

Avoid:

/api/v1/todo
/api/v1/getTodos
/api/v1/create-project

HTTP methods describe the action.

HTTP Methods

Use:

- GET to retrieve data
- POST to create a resource
- PUT to replace or fully update a resource
- PATCH to partially update a resource
- DELETE to delete a resource

Do not use GET for mutations.

Standard Status Codes

Use these defaults:

200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
503 Service Unavailable

Create

Successful creation returns:

201 Created

The response should include the created resource unless there is a documented reason not to.

Read

Successful reads return:

200 OK

Update

Successful updates normally return:

200 OK

The response should include the updated resource.

Delete

Successful deletion normally returns:

204 No Content

A 204 response must not contain a response body.

Request and Response Schemas

Every request body must use a Pydantic schema.

Every successful response should declare a response model.

Use separate schemas when responsibilities differ:

TodoCreate
TodoUpdate
TodoResponse

Do not reuse a database table class as the public API contract.

Resource Response Example

{
"id": "1c90be57-2ab5-4686-9909-e32ae02f836d",
"title": "Write documentation",
"description": "Finish the API standards",
"completed": false,
"createdAt": "2026-07-19T05:00:00Z",
"updatedAt": "2026-07-19T05:00:00Z"
}

The exact casing convention must remain consistent across the API.

For this template, public JSON fields use camelCase.

Python models may use snake_case internally and define aliases for public responses.

Collection Response

Collection endpoints should not return an undocumented raw list once pagination is added.

Use:

{
"items": [],
"pagination": {
"page": 1,
"pageSize": 20,
"totalItems": 0,
"totalPages": 0
}
}

Pagination

Use these query parameters:

page
pageSize

Example:

GET /api/v1/todos?page=1&pageSize=20

Defaults:

page=1
pageSize=20

Recommended maximum:

pageSize=100

Invalid pagination values return a validation error.

Filtering

Use query parameters for filters.

Examples:

GET /api/v1/todos?completed=true
GET /api/v1/todos?search=documentation

Filters should be optional unless the endpoint documents otherwise.

Sorting

Use:

sort
order

Example:

GET /api/v1/todos?sort=createdAt&order=desc

Allowed sort fields must be explicitly validated.

Do not allow arbitrary database column names from user input.

Path Parameters

Path parameters should clearly identify the resource:

/api/v1/todos/{todo_id}

Identifiers should be validated before database work begins.

Invalid UUID formats should return a validation response rather than an internal error.

Error Response

All application errors use one consistent structure:

{
"error": {
"code": "todo_not_found",
"message": "Todo not found",
"details": null,
"requestId": "01J2EXAMPLE"
}
}

Error Fields

code

A stable machine-readable value.

message

A safe human-readable explanation.

details

Optional structured context.

requestId

The request identifier used to find related logs.

Validation Error

Validation errors should be normalized to the standard error structure.

Example:

{
"error": {
"code": "validation_error",
"message": "The request contains invalid values.",
"details": [
{
"field": "title",
"message": "Title must contain at least 3 characters."
}
],
"requestId": "01J2EXAMPLE"
}
}

Do not expose raw framework validation output without reviewing its public shape.

Error Codes

Use lowercase snake_case.

Examples:

validation_error
todo_not_found
todo_title_conflict
database_unavailable
unauthorized
forbidden
internal_error

Error codes should remain stable even if the human-readable message changes.

Request IDs

Every request should have a request ID.

FastAPI should:

1. Accept an incoming trusted request ID when appropriate.
2. Generate one when none exists.
3. Include it in logs.
4. Return it in a response header.
5. Include it in application error responses.

Recommended header:

X-Request-ID

Authentication

Authentication is not included in version 1.

When authentication is added:

- Missing or invalid identity returns 401.
- Authenticated users without permission receive 403.
- Protected endpoints use shared dependencies.
- Routes do not repeat token parsing logic.

Idempotency

Endpoints that may be retried and create duplicate side effects should support idempotency when that requirement appears.

Examples include:

- Payments
- Webhook processing
- Provisioning
- External job creation

The Todo example does not require idempotency support.

Dates and Times

API timestamps must use ISO 8601 with a timezone.

Preferred UTC output:

2026-07-19T05:00:00Z

Do not return locale-formatted dates from the API.

Boolean Values

Use JSON boolean values:

true
false

Do not use:

"true"
"false"
1
0

unless a specific external contract requires them.

Empty Results

An empty collection returns:

200 OK

with:

{
"items": [],
"pagination": {
"page": 1,
"pageSize": 20,
"totalItems": 0,
"totalPages": 0
}
}

An empty collection is not a 404.

A missing individual resource returns 404.

OpenAPI

Every endpoint should include:

- Summary
- Description when useful
- Tags
- Request schema
- Response schema
- Expected status codes
- Documented error responses

Generated OpenAPI is the source for frontend client generation.

Changes to API contracts must regenerate the frontend client.

Tags

Group endpoints by resource or domain.

Examples:

Health
Todos
Users
Projects

Avoid creating a different tag for every endpoint.

Deprecation

Deprecated endpoints should be marked in OpenAPI and documented before removal.

Breaking changes should normally be introduced through a new API version.

Security

API responses must not reveal:

- Database passwords
- Connection strings
- Stack traces
- Tokens
- Cookies
- Internal file paths
- Private exception details

Internal errors should be logged securely and returned as a safe standard response.

Final Rule

An API endpoint should be understandable from its path, HTTP method, request schema, response schema, status code, and OpenAPI documentation without requiring knowledge of its internal implementation.
