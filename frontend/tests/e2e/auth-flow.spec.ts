import { test, expect } from "@playwright/test";

const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: "testpassword123",
  orgName: `Test Org ${Date.now()}`,
};

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display landing page when not authenticated", async ({
    page,
  }) => {
    await expect(page.getByTestId("landing-title")).toBeVisible();
    await expect(page.getByTestId("landing-tagline")).toBeVisible();
    await expect(page.getByTestId("get-started-button")).toBeVisible();
    await expect(page.getByTestId("login-button")).toBeVisible();
  });

  test("should complete full signup flow", async ({ page }) => {
    await page.getByTestId("get-started-button").click();

    await expect(page).toHaveURL("/register");
    await expect(page.getByTestId("register-title")).toBeVisible();

    await page.getByTestId("register-email-input").fill(testUser.email);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page.getByTestId("register-confirm-password-input").fill(testUser.password);

    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 15000 });
    await expect(page.getByTestId("onboarding-welcome-title")).toBeVisible();
    await expect(page.getByTestId("onboarding-subtitle")).toBeVisible();

    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await expect(page.getByTestId("dashboard-greeting")).toBeVisible();
    await expect(page.getByTestId("dashboard-weekly-stats-title")).toBeVisible();
  });

  test("should show validation errors on signup", async ({ page }) => {
    await page.goto("/register");

    await page.getByTestId("register-submit-button").click();
    await expect(page.getByTestId("register-error")).toBeVisible();

    await page.getByTestId("register-email-input").fill(testUser.email);
    await page.getByTestId("register-password-input").fill("short");
    await page.getByTestId("register-confirm-password-input").fill("short");
    await page.getByTestId("register-submit-button").click();

    await expect(page.getByTestId("register-error")).toBeVisible();

    await page.getByTestId("register-password-input").fill("password123");
    await page.getByTestId("register-confirm-password-input").fill("different123");
    await page.getByTestId("register-submit-button").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
  });
});

test.describe("Login Flow", () => {
  test.beforeEach(async ({ page }) => {
    const signupEmail = `login-test-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByTestId("register-email-input").fill(signupEmail);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page.getByTestId("register-confirm-password-input").fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });

    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    });

    await page.goto("/");
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("login-email-input").fill("wrong@example.com");
    await page.getByTestId("login-password-input").fill("wrongpassword");
    await page.getByTestId("login-submit-button").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });

  test("should show validation error when fields are empty", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByTestId("login-submit-button").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
  });
});

test.describe("Route Guards", () => {
  let authenticatedEmail: string;

  test.beforeEach(async ({ page }) => {
    authenticatedEmail = `guard-test-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByTestId("register-email-input").fill(authenticatedEmail);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page.getByTestId("register-confirm-password-input").fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });

    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect authenticated user from landing to dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect authenticated user from login to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect authenticated user from register to dashboard", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect to onboarding if no organization exists", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    });

    const newEmail = `no-org-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByTestId("register-email-input").fill(newEmail);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page.getByTestId("register-confirm-password-input").fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });
  });

  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login", { timeout: 10000 });
  });

  test("should redirect from onboarding to dashboard if organization exists", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });
});

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    const email = `onboarding-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByTestId("register-email-input").fill(email);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page.getByTestId("register-confirm-password-input").fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });
  });

  test("should create organization successfully", async ({ page }) => {
    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should show validation error when organization name is too short", async ({
    page,
  }) => {
    await page.getByTestId("onboarding-org-name-input").fill("A");
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page.getByTestId("onboarding-error")).toBeVisible();
  });

  test("should show error when organization name is empty", async ({
    page,
  }) => {
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page.getByTestId("onboarding-error")).toBeVisible();
  });
});
