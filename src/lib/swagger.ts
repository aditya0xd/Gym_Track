import swaggerJsdoc from "swagger-jsdoc";

const serverUrl =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

const errorMessage = {
  type: "object",
  properties: {
    message: { type: "string" },
    error: { type: "string" },
  },
};

const unauthorized = {
  description: "Missing or invalid session",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { error: { type: "string", example: "Unauthorized" } },
      },
    },
  },
};

const memberBillingDuration = {
  type: "string",
  enum: ["ONE_MONTH", "THREE_MONTHS", "SIX_MONTHS", "TWELVE_MONTHS"],
};

const ownerSubscriptionPlan = {
  type: "string",
  enum: ["TRIAL", "STARTER", "PRO"],
};

const paymentStatus = {
  type: "string",
  enum: ["DONE", "PARTIAL", "NOT_DONE"],
};

const memberSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    fullName: { type: "string" },
    email: { type: "string", nullable: true },
    phone: { type: "string" },
    billingDuration: memberBillingDuration,
    planPrice: { type: "string", description: "Decimal INR string" },
    discountInr: { type: "string" },
    amountPaid: { type: "string" },
    paymentStatus: paymentStatus,
    memberPhoto: { type: "string", nullable: true },
    upiScreenshot: { type: "string", nullable: true },
    startDate: { type: "string", format: "date", example: "2026-06-01" },
    endDate: { type: "string", format: "date" },
    whatsappEnabled: { type: "boolean" },
    membershipStatus: { type: "string" },
    pausedAt: { type: "string", format: "date-time", nullable: true },
  },
};

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Gym Admin Portal API",
      version: "1.0.0",
      description:
        "REST API for the gym owner dashboard and superadmin console. " +
        "Authenticated routes require a NextAuth session cookie set after sign-in via `/api/auth/signin`.",
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: "Auth", description: "Registration and NextAuth session routes" },
      { name: "Gym Owner — Members", description: "Member CRUD, bulk import/export, reminders" },
      { name: "Gym Owner — Billing", description: "Subscription invoices and Razorpay payments" },
      { name: "Gym Owner — Plan", description: "Owner subscription plan and pricing" },
      { name: "Gym Owner — Analytics", description: "Dashboard analytics (plan-gated)" },
      { name: "Superadmin", description: "Platform administration" },
      { name: "Cron", description: "Scheduled background jobs" },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
          description:
            "NextAuth session cookie. Sign in at `/login` (gym owner) or `/superadmin/login` first.",
        },
        cronBearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "CRON_SECRET",
          description: "Bearer token matching the CRON_SECRET environment variable.",
        },
      },
      schemas: {
        ErrorMessage: errorMessage,
        Member: memberSchema,
        SignupRequest: {
          type: "object",
          required: ["name", "email", "password", "confirmPassword"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            confirmPassword: { type: "string" },
          },
        },
        CreateMemberRequest: {
          type: "object",
          required: ["fullName", "phone", "billingDuration", "startDate"],
          properties: {
            fullName: { type: "string" },
            email: { type: "string", format: "email", nullable: true },
            phone: { type: "string" },
            billingDuration: memberBillingDuration,
            startDate: { type: "string", format: "date", example: "2026-06-01" },
            whatsappEnabled: { type: "boolean", default: true },
            paymentStatus: paymentStatus,
            memberPhoto: { type: "string", nullable: true },
            upiScreenshot: { type: "string", nullable: true },
            discountInr: { type: "string" },
            amountPaid: { type: "string" },
          },
        },
        DurationPrice: {
          type: "object",
          properties: {
            duration: memberBillingDuration,
            priceInr: { type: "string" },
          },
        },
        MembershipPlanPriceRow: {
          type: "object",
          properties: {
            duration: memberBillingDuration,
            priceInr: { type: "string", nullable: true },
          }
        },
        MembershipPlan: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            category: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            sortOrder: { type: "integer" },
            benefits: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  label: { type: "string" },
                  sortOrder: { type: "integer" }
                }
              }
            },
            prices: {
              type: "array",
              items: { $ref: "#/components/schemas/MembershipPlanPriceRow" }
            },
            activeMemberCount: { type: "integer" }
          }
        },
        MembershipPlanCreateRequest: {
          type: "object",
          required: ["name", "benefits", "prices"],
          properties: {
            name: { type: "string" },
            category: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            benefits: { type: "array", items: { type: "string" } },
            prices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  duration: memberBillingDuration,
                  priceInr: { type: "string" }
                }
              }
            }
          }
        },
        OwnerInvoice: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            plan: ownerSubscriptionPlan,
            amountInr: { type: "string" },
            status: { type: "string" },
            dueDate: { type: "string", format: "date" },
            paidAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/api/auth/signup": {
        post: {
          tags: ["Auth"],
          summary: "Register a new gym owner account",
          description: "Creates a TRIAL plan account with a 14-day trial period.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SignupRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Account created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "Account created successfully." },
                    },
                  },
                },
              },
            },
            "400": { description: "Validation error", content: { "application/json": { schema: errorMessage } } },
            "409": { description: "Email already registered", content: { "application/json": { schema: errorMessage } } },
          },
        },
      },
      "/api/auth/signin": {
        post: {
          tags: ["Auth"],
          summary: "Sign in (NextAuth credentials)",
          description:
            "NextAuth credentials provider. Use the browser login form or POST credentials here. " +
            "Sets the session cookie used by authenticated routes.",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    callbackUrl: { type: "string" },
                    json: { type: "boolean", default: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Sign-in result (NextAuth)" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/api/owner/members": {
        get: {
          tags: ["Gym Owner — Members"],
          summary: "List members",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": {
              description: "Member list",
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/Member" } },
                },
              },
            },
            "401": unauthorized,
          },
        },
        post: {
          tags: ["Gym Owner — Members"],
          summary: "Create a member",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateMemberRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Member created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Member" } } },
            },
            "400": { description: "Validation error", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
          },
        },
      },
      "/api/owner/members/export": {
        get: {
          tags: ["Gym Owner — Members"],
          summary: "Export members CSV or download import template",
          description: "Requires BULK_IMPORT_EXPORT plan feature. Add `?template=1` for the import template.",
          security: [{ sessionCookie: [] }],
          parameters: [
            {
              name: "template",
              in: "query",
              schema: { type: "string", enum: ["1"] },
              description: "Set to `1` to download the import template instead of exporting members.",
            },
          ],
          responses: {
            "200": {
              description: "CSV file",
              content: { "text/csv": { schema: { type: "string", format: "binary" } } },
            },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
      },
      "/api/owner/members/import": {
        post: {
          tags: ["Gym Owner — Members"],
          summary: "Bulk import members from CSV",
          description: "Requires BULK_IMPORT_EXPORT. Send multipart/form-data with a `file` field, or raw text/csv body.",
          security: [{ sessionCookie: [] }],
          requestBody: {
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: { type: "string", format: "binary" },
                  },
                  required: ["file"],
                },
              },
              "text/csv": { schema: { type: "string" } },
            },
          },
          responses: {
            "200": {
              description: "Import summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      imported: { type: "integer" },
                      skipped: { type: "integer" },
                      errors: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
            "400": { description: "Invalid file", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
      },
      "/api/owner/members/{id}/membership-status": {
        post: {
          tags: ["Gym Owner — Members"],
          summary: "Pause or resume a membership",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: { type: "string", enum: ["pause", "resume"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Membership updated" },
            "400": { description: "Invalid action", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
          },
        },
      },
      "/api/owner/members/{id}/reminder": {
        post: {
          tags: ["Gym Owner — Members"],
          summary: "Send a manual reminder to a member",
          description: "Requires MANUAL_MEMBER_REMINDERS plan feature.",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reminderType: {
                      type: "string",
                      enum: ["MEMBERSHIP_EXPIRY", "PAYMENT_DUE"],
                      default: "MEMBERSHIP_EXPIRY",
                    },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Reminder queued or sent" },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
      },
      "/api/owner/analytics": {
        get: {
          tags: ["Gym Owner — Analytics"],
          summary: "Dashboard analytics",
          description: "Requires ANALYTICS plan feature.",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": { description: "Analytics payload" },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
      },
      "/api/owner/pricing": {
        get: {
          tags: ["Gym Owner — Plan"],
          summary: "List custom membership duration prices",
          description: "Requires CUSTOM_MEMBERSHIP_PRICING plan feature.",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": {
              description: "Duration prices",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      prices: {
                        type: "array",
                        items: { $ref: "#/components/schemas/DurationPrice" },
                      },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
        put: {
          tags: ["Gym Owner — Plan"],
          summary: "Update all duration prices",
          description: "Submit all four durations (1, 3, 6, 12 months). Requires CUSTOM_MEMBERSHIP_PRICING.",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prices"],
                  properties: {
                    prices: {
                      type: "array",
                      items: { $ref: "#/components/schemas/DurationPrice" },
                      minItems: 4,
                      maxItems: 4,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Updated prices" },
            "400": { description: "Validation error", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
      },
      "/api/owner/membership-plans": {
        get: {
          tags: ["Gym Owner — Plan"],
          summary: "List custom membership plans",
          description: "Requires CUSTOM_MEMBERSHIP_PRICING plan feature.",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": {
              description: "Membership plans",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      plans: {
                        type: "array",
                        items: { $ref: "#/components/schemas/MembershipPlan" },
                      },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
        post: {
          tags: ["Gym Owner — Plan"],
          summary: "Create a new membership plan",
          description: "Requires CUSTOM_MEMBERSHIP_PRICING plan feature.",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MembershipPlanCreateRequest" },
              },
            },
          },
          responses: {
            "201": { description: "Plan created", content: { "application/json": { schema: { type: "object", properties: { plan: { $ref: "#/components/schemas/MembershipPlan" } } } } } },
            "400": { description: "Validation error", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
      },
      "/api/owner/membership-plans/{id}": {
        get: {
          tags: ["Gym Owner — Plan"],
          summary: "Get a specific membership plan",
          description: "Requires CUSTOM_MEMBERSHIP_PRICING plan feature.",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Membership plan", content: { "application/json": { schema: { type: "object", properties: { plan: { $ref: "#/components/schemas/MembershipPlan" } } } } } },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
        patch: {
          tags: ["Gym Owner — Plan"],
          summary: "Update a membership plan",
          description: "Requires CUSTOM_MEMBERSHIP_PRICING plan feature.",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MembershipPlanCreateRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Plan updated", content: { "application/json": { schema: { type: "object", properties: { plan: { $ref: "#/components/schemas/MembershipPlan" } } } } } },
            "400": { description: "Validation error", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
        delete: {
          tags: ["Gym Owner — Plan"],
          summary: "Soft delete a membership plan",
          description: "Requires CUSTOM_MEMBERSHIP_PRICING plan feature. Fails if members are active on it.",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Plan deleted", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } } },
            "400": { description: "Cannot delete plan with active members", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
            "403": { description: "Plan feature not available" },
          },
        },
      },
      "/api/owner/manage-plan": {
        get: {
          tags: ["Gym Owner — Plan"],
          summary: "Current plan, trial, and billing invoices",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": {
              description: "Plan and invoice data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      subscriptionPlan: ownerSubscriptionPlan,
                      trialEndsAt: { type: "string", format: "date-time", nullable: true },
                      invoices: {
                        type: "array",
                        items: { $ref: "#/components/schemas/OwnerInvoice" },
                      },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
          },
        },
        patch: {
          tags: ["Gym Owner — Plan"],
          summary: "Change subscription plan",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["subscriptionPlan"],
                  properties: {
                    subscriptionPlan: ownerSubscriptionPlan,
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Plan updated or unchanged" },
            "400": { description: "Invalid plan", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
          },
        },
      },
      "/api/owner/billing/{id}": {
        delete: {
          tags: ["Gym Owner — Billing"],
          summary: "Delete an unpaid invoice",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Invoice removed" },
            "401": unauthorized,
          },
        },
      },
      "/api/owner/billing/{id}/pay": {
        post: {
          tags: ["Gym Owner — Billing"],
          summary: "Mark invoice paid (manual / offline)",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Invoice marked paid" },
            "401": unauthorized,
          },
        },
      },
      "/api/owner/billing/{id}/razorpay/order": {
        post: {
          tags: ["Gym Owner — Billing"],
          summary: "Create a Razorpay order for an invoice",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Razorpay checkout payload",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      keyId: { type: "string" },
                      orderId: { type: "string" },
                      amount: { type: "integer", description: "Amount in paise" },
                      currency: { type: "string", example: "INR" },
                      invoiceId: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
          },
        },
      },
      "/api/owner/billing/{id}/razorpay/verify": {
        post: {
          tags: ["Gym Owner — Billing"],
          summary: "Verify Razorpay payment and mark invoice paid",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["razorpayOrderId", "razorpayPaymentId", "razorpaySignature"],
                  properties: {
                    razorpayOrderId: { type: "string" },
                    razorpayPaymentId: { type: "string" },
                    razorpaySignature: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Payment verified" },
            "400": { description: "Invalid signature or payload", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
          },
        },
      },
      "/api/owner/billing/{id}/receipt": {
        get: {
          tags: ["Gym Owner — Billing"],
          summary: "Download invoice receipt PDF",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "PDF receipt",
              content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
            },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/superadmin/gym-owners": {
        get: {
          tags: ["Superadmin"],
          summary: "List gym owners with member counts",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": {
              description: "Gym owner list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      gymOwners: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            name: { type: "string" },
                            email: { type: "string" },
                            subscriptionPlan: ownerSubscriptionPlan,
                            trialEndsAt: { type: "string", format: "date-time", nullable: true },
                            memberCount: { type: "integer" },
                            createdAt: { type: "string", format: "date-time" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
          },
        },
      },
      "/api/superadmin/gym-owners/{id}": {
        patch: {
          tags: ["Superadmin"],
          summary: "Update gym owner subscription or trial end date",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    subscriptionPlan: ownerSubscriptionPlan,
                    trialEndsAt: { type: "string", format: "date-time", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Gym owner updated" },
            "400": { description: "Validation error", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
          },
        },
      },
      "/api/superadmin/platform-pricing": {
        get: {
          tags: ["Superadmin"],
          summary: "Get platform plan prices (INR)",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": {
              description: "Plan price map",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      prices: {
                        type: "object",
                        additionalProperties: { type: "string" },
                        example: { TRIAL: "0.00", STARTER: "1499.00", PRO: "2999.00" },
                      },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
          },
        },
        put: {
          tags: ["Superadmin"],
          summary: "Update platform plan prices",
          security: [{ sessionCookie: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: {
                    type: "string",
                    pattern: "^\\d+(\\.\\d{1,2})?$",
                    example: "1499.00",
                  },
                  example: { STARTER: "1499.00", PRO: "2999.00" },
                },
              },
            },
          },
          responses: {
            "200": { description: "Updated prices" },
            "400": { description: "Invalid plan or price", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
          },
        },
      },
      "/api/superadmin/plan-features": {
        get: {
          tags: ["Superadmin"],
          summary: "Get plan feature matrix",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": {
              description: "Feature flags per plan",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      features: {
                        type: "object",
                        additionalProperties: {
                          type: "object",
                          additionalProperties: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
          },
        },
        put: {
          tags: ["Superadmin"],
          summary: "Replace plan feature matrix",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    TRIAL: { type: "object", additionalProperties: { type: "boolean" } },
                    STARTER: { type: "object", additionalProperties: { type: "boolean" } },
                    PRO: { type: "object", additionalProperties: { type: "boolean" } },
                  },
                  required: ["TRIAL", "STARTER", "PRO"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Updated features" },
            "400": { description: "Invalid matrix", content: { "application/json": { schema: errorMessage } } },
            "401": unauthorized,
          },
        },
      },
      "/api/cron/member-expiry-reminders": {
        get: {
          tags: ["Cron"],
          summary: "Run scheduled membership expiry reminders",
          description:
            "Sends reminders for members expiring tomorrow. Authorized via Vercel Cron header, " +
            "`Authorization: Bearer CRON_SECRET`, or `?secret=CRON_SECRET`.",
          security: [{ cronBearer: [] }],
          responses: {
            "200": { description: "Cron run summary" },
            "401": unauthorized,
            "500": { description: "Cron run failed" },
          },
        },
      },
    },
  },
  apis: [],
};

export function getApiDocs() {
  return swaggerJsdoc(swaggerOptions);
}
