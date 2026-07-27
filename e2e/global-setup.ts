import { runDatabaseCommand } from "./support/database";

export default function globalSetup(): void {
  runDatabaseCommand("prepare");
}
