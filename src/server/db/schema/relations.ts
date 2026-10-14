import { relations } from "drizzle-orm";
import { users } from "./auth";
import { clients } from "./crm";
import { milestones, projectMembers, projects, projectUpdates } from "./projects";
import { events, tasks, timeEntries } from "./work";
import { accounts, categories, invoiceItems, invoices, transactions } from "./finance";
import { contractEvents, contracts, contractSignatures } from "./contracts";
import { posts, series } from "./content";

export const usersRelations = relations(users, ({ one }) => ({
  client: one(clients, { fields: [users.clientId], references: [clients.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  users: many(users),
  invoices: many(invoices),
  contracts: many(contracts),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  members: many(projectMembers),
  milestones: many(milestones),
  updates: many(projectUpdates),
  tasks: many(tasks),
  timeEntries: many(timeEntries),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, { fields: [milestones.projectId], references: [projects.id] }),
}));

export const projectUpdatesRelations = relations(projectUpdates, ({ one }) => ({
  project: one(projects, { fields: [projectUpdates.projectId], references: [projects.id] }),
  author: one(users, { fields: [projectUpdates.createdBy], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  project: one(projects, { fields: [timeEntries.projectId], references: [projects.id] }),
  task: one(tasks, { fields: [timeEntries.taskId], references: [tasks.id] }),
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  project: one(projects, { fields: [events.projectId], references: [projects.id] }),
  client: one(clients, { fields: [events.clientId], references: [clients.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  project: one(projects, { fields: [transactions.projectId], references: [projects.id] }),
  client: one(clients, { fields: [transactions.clientId], references: [clients.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  client: one(clients, { fields: [contracts.clientId], references: [clients.id] }),
  project: one(projects, { fields: [contracts.projectId], references: [projects.id] }),
  signatures: many(contractSignatures),
  events: many(contractEvents),
}));

export const contractSignaturesRelations = relations(contractSignatures, ({ one }) => ({
  contract: one(contracts, { fields: [contractSignatures.contractId], references: [contracts.id] }),
}));

export const contractEventsRelations = relations(contractEvents, ({ one }) => ({
  contract: one(contracts, { fields: [contractEvents.contractId], references: [contracts.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  series: one(series, { fields: [posts.seriesId], references: [series.id] }),
  project: one(projects, { fields: [posts.projectId], references: [projects.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  posts: many(posts),
}));
