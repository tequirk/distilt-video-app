import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import React from "react";
import { Text, View } from "react-native";
import migrations from "../drizzle/migrations";

/**
 * Opens a connection to the database and returns the database object.
 */
export function useDb() {
  const expoDb = openDatabaseSync("db.db");
  const db = drizzle(expoDb);

  return { expoDb, db };
}

/**
 * Component that handles database migrations and renders migration status
 */
export function MigrationStatus({
  db,
  children,
}: {
  db: ExpoSQLiteDatabase<Record<string, never>>;
  children: React.ReactNode;
}) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View>
        <Text>Migration error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View>
        <Text>Migration is in progress...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
