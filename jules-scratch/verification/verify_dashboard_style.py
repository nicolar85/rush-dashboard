from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Go to the app
        page.goto("http://localhost:3000")

        # Log in
        page.get_by_label("Username").fill("admin")
        page.get_by_label("Password").fill("rush2025")
        page.get_by_role("button", name="Accedi").click()

        # Wait for the main dashboard to be visible
        # We can wait for the new header title to appear
        expect(page.get_by_role("heading", name="Dashboard Generale")).to_be_visible(timeout=10000)

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/dashboard_screenshot.png")

        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Take a screenshot even on error to help debug
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")

    finally:
        # Clean up
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
