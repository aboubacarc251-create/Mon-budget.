import * as SQLite from 'expo-sqlite';

export const dbPromise = SQLite.openDatabaseAsync('mon_budget.db');

export async function initDb() {
  const db = await dbPromise;
  await db.execAsync(` PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS accounts ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL, opening_balance INTEGER NOT NULL DEFAULT 0, balance INTEGER NOT NULL DEFAULT 0, is_archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE IF NOT EXISTS transactions ( id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK(kind IN ('income','expense','transfer_in','transfer_out')), account_id INTEGER NOT NULL, transfer_group TEXT, category TEXT NOT NULL, description TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0), occurred_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(account_id) REFERENCES accounts(id) ); CREATE TABLE IF NOT EXISTS budgets ( id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT NOT NULL, category TEXT NOT NULL, limit_amount INTEGER NOT NULL, UNIQUE(month, category) ); CREATE TABLE IF NOT EXISTS goals ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, target_amount INTEGER NOT NULL, saved_amount INTEGER NOT NULL DEFAULT 0, deadline TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE IF NOT EXISTS settings ( key TEXT PRIMARY KEY, value TEXT NOT NULL ); `);
  const count = await db.getFirstAsync<{n:number}>('SELECT COUNT(*) as n FROM accounts');
  if (!count?.n) {
    const defaults = [
      ['Espèces','cash'],['Banque','bank'],['Orange Money','mobile'],['MTN Mobile Money','mobile'],['Épargne','savings']
    ];
    for (const [name,type] of defaults) {
      await db.runAsync('INSERT INTO accounts(name,type,opening_balance,balance) VALUES(?,?,0,0)', name, type);
    }
  }
}

export type Account = {id:number;name:string;type:string;opening_balance:number;balance:number;is_archived:number};
export type Tx = {id:number;kind:string;account_id:number;category:string;description:string;amount:number;occurred_at:string};

export async function getAccounts(): Promise<Account[]> {
  const db = await dbPromise;
  return db.getAllAsync<Account>('SELECT * FROM accounts WHERE is_archived=0 ORDER BY id');
}

export async function createAccount(name:string,type:string,opening:number) {
  const db = await dbPromise;
  await db.runAsync('INSERT INTO accounts(name,type,opening_balance,balance) VALUES(?,?,?,?)', name.trim(),type,opening,opening);
}

export async function addMovement(kind:'income'|'expense', accountId:number, category:string, description:string, amount:number, date:string) {
  const db = await dbPromise;
  await db.withTransactionAsync(async () => {
    const account = await db.getFirstAsync<{balance:number}>('SELECT balance FROM accounts WHERE id=?',accountId);
    if (!account) throw new Error('Compte introuvable.');
    if (kind === 'expense' && account.balance < amount) throw new Error('Solde insuffisant.');
    const delta = kind === 'income' ? amount : -amount;
    await db.runAsync('UPDATE accounts SET balance=balance+? WHERE id=?',delta,accountId);
    await db.runAsync(
      'INSERT INTO transactions(kind,account_id,category,description,amount,occurred_at) VALUES(?,?,?,?,?,?)',
      kind,accountId,category,description.trim(),amount,date
    );
  });
}

export async function transferMoney(fromId:number,toId:number,amount:number,date:string) {
  if (fromId === toId) throw new Error('Choisis deux comptes différents.');
  const db = await dbPromise;
  const group = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.withTransactionAsync(async () => {
    const from = await db.getFirstAsync<{balance:number}>('SELECT balance FROM accounts WHERE id=?',fromId);
    const to = await db.getFirstAsync<{id:number}>('SELECT id FROM accounts WHERE id=?',toId);
    if (!from || !to) throw new Error('Compte introuvable.');
    if (from.balance < amount) throw new Error('Solde insuffisant.');
    await db.runAsync('UPDATE accounts SET balance=balance-? WHERE id=?',amount,fromId);
    await db.runAsync('UPDATE accounts SET balance=balance+? WHERE id=?',amount,toId);
    await db.runAsync(
      'INSERT INTO transactions(kind,account_id,transfer_group,category,description,amount,occurred_at) VALUES(?,?,?,?,?,?,?)',
      'transfer_out',fromId,group,'Transfert',`Transfert vers le compte ${toId}`,amount,date
    );
    await db.runAsync(
      'INSERT INTO transactions(kind,account_id,transfer_group,category,description,amount,occurred_at) VALUES(?,?,?,?,?,?,?)',
      'transfer_in',toId,group,'Transfert',`Transfert depuis le compte ${fromId}`,amount,date
    );
  });
}

export async function getTransactions(): Promise<Tx[]> {
  const db = await dbPromise;
  return db.getAllAsync<Tx>(
    `SELECT t.*, a.name as account_name FROM transactions t JOIN accounts a ON a.id=t.account_id ORDER BY t.id DESC LIMIT 300`
  );
}

export async function saveBudget(month:string,category:string,limit:number) {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT INTO budgets(month,category,limit_amount) VALUES(?,?,?) ON CONFLICT(month,category) DO UPDATE SET limit_amount=excluded.limit_amount`,
    month,category,limit
  );
}

export async function getBudgets(month:string) {
  const db = await dbPromise;
  return db.getAllAsync<any>(
    `SELECT b.*, COALESCE(SUM(CASE WHEN t.kind='expense' THEN t.amount ELSE 0 END),0) spent FROM budgets b LEFT JOIN transactions t ON t.category=b.category AND substr(t.occurred_at,1,7)=b.month WHERE b.month=? GROUP BY b.id ORDER BY b.category`,month
  );
}

export async function createGoal(name:string,target:number,deadline:string) {
  const db = await dbPromise;
  await db.runAsync('INSERT INTO goals(name,target_amount,deadline) VALUES(?,?,?)',name.trim(),target,deadline);
}
export async function getGoals() {
  const db = await dbPromise;
  return db.getAllAsync<any>('SELECT * FROM goals ORDER BY id DESC');
}
export async function contributeGoal(id:number,amount:number) {
  const db = await dbPromise;
  const g = await db.getFirstAsync<any>('SELECT * FROM goals WHERE id=?',id);
  if (!g || amount <= 0 || g.saved_amount + amount > g.target_amount) throw new Error('Montant invalide pour cet objectif.');
  await db.runAsync('UPDATE goals SET saved_amount=saved_amount+? WHERE id=?',amount,id);
}
