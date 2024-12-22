import invariant from "tiny-invariant";
import { Prisma, PrismaClient } from "@prisma/client";

import { Singleton } from "~/util/singleton";

const prisma = Singleton("prisma", getClient);

function getClient() {
	const DATABASE_URL = process.env.DATABASE_URL;
	invariant(typeof DATABASE_URL === "string", "DATABASE_URL env var not set");

	const databaseUrl = new URL(DATABASE_URL);
	console.info(`🔌 setting up prisma client to ${databaseUrl.host}`);
	// NOTE: during development if you change anything in this function, remember
	// that this only runs once per server restart and won't automatically be
	// re-run per request like everything else is. So if you need to change
	// something in this file, you'll need to manually restart the server.
	const client = new PrismaClient({
		datasources: {
			db: {
				url: databaseUrl.toString(),
			},
		},
	});
	// connect eagerly
	client.$connect();

	return client;
}

export async function AtomicTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
	return prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
}

export { prisma };