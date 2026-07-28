import { expect, test } from "@playwright/test";

test("creates, updates, and archives a project through PostgreSQL", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const projectName = `Playwright Project ${suffix}`;
  const updatedName = `${projectName} Updated`;
  const initialDescription = "Created by the browser lifecycle test.";
  const updatedDescription = "Updated through the full browser-to-database flow.";

  await page.goto("/projects");

  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByText("Projects could not be loaded", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No projects yet" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Project list" })).toHaveCount(0);

  await page.getByRole("button", { name: "Create project" }).click();
  const createDialog = page.getByRole("dialog", { name: "Create project" });
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel("Name").fill(projectName);
  await createDialog.getByLabel("Description").fill(initialDescription);
  await createDialog.getByRole("button", { name: "Create project" }).click();
  await expect(createDialog).toHaveCount(0);

  const projectList = page.getByRole("region", { name: "Project list" });
  await expect(projectList).toBeVisible();
  const createdCard = projectList.getByRole("article", {
    name: `Project ${projectName}`,
    exact: true,
  });
  await expect(createdCard).toBeVisible();
  await expect(createdCard.getByText(initialDescription, { exact: true })).toBeVisible();

  await createdCard.getByRole("button", { name: "Edit", exact: true }).click();
  const editDialog = page.getByRole("dialog", { name: `Edit ${projectName}` });
  await editDialog.getByLabel("Name").fill(updatedName);
  await editDialog.getByLabel("Description").fill(updatedDescription);
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(editDialog).toHaveCount(0);

  const updatedCard = projectList.getByRole("article", {
    name: `Project ${updatedName}`,
    exact: true,
  });
  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText(updatedDescription, { exact: true })).toBeVisible();
  await expect(createdCard).toHaveCount(0);

  await updatedCard.getByRole("button", { name: "Archive", exact: true }).click();
  const archiveDialog = page.getByRole("alertdialog", {
    name: `Archive ${updatedName}?`,
  });
  await expect(archiveDialog).toBeVisible();
  await archiveDialog.getByRole("button", { name: "Archive project" }).click();
  await expect(archiveDialog).toHaveCount(0);

  await expect(updatedCard.getByText("Archived", { exact: true })).toBeVisible();
  await expect(updatedCard.getByText("Read only", { exact: true })).toBeVisible();
  await expect(updatedCard.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await expect(
    updatedCard.getByRole("button", { name: "Archive", exact: true }),
  ).toHaveCount(0);
});
