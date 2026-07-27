import { runDatabaseCommand } from "./support/database";

export default function globalTeardown(): void {
  runDatabaseCommand("cleanup");
}
