# MySQL Connection Fix - Solved!

## Problem
MySQL 9.0 was installed but couldn't start because it can't upgrade from MySQL 8.0.30 data directory.

## Solution Applied
Downgraded to MySQL 8.4 LTS which is compatible with 8.0 data.

## Current Status
✅ MySQL 8.4.7 is now installed and running

## Next Steps - Complete the Setup

### Step 1: Connect to MySQL

You have an existing root password from your previous MySQL installation. Try connecting:

```bash
/opt/homebrew/opt/mysql@8.4/bin/mysql -u root -p
```

**Enter your existing root password when prompted.**

---

### Step 2: If You Don't Remember the Root Password

#### Option A: Reset Root Password (Safe Method)

1. **Stop MySQL:**
   ```bash
   brew services stop mysql@8.4
   ```

2. **Start MySQL in safe mode:**
   ```bash
   /opt/homebrew/opt/mysql@8.4/bin/mysqld_safe --skip-grant-tables &
   ```

3. **In a new terminal, connect without password:**
   ```bash
   /opt/homebrew/opt/mysql@8.4/bin/mysql -u root
   ```

4. **Reset the password:**
   ```sql
   FLUSH PRIVILEGES;
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password_here';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **Kill safe mode MySQL:**
   ```bash
   ps aux | grep mysqld
   kill <PID>  # Kill the mysqld process
   ```

6. **Restart MySQL normally:**
   ```bash
   brew services start mysql@8.4
   ```

#### Option B: Fresh Start (Nuclear Option)

If you don't need the old data:

1. **Stop MySQL:**
   ```bash
   brew services stop mysql@8.4
   ```

2. **Backup old data (just in case):**
   ```bash
   mv /opt/homebrew/var/mysql /opt/homebrew/var/mysql_old_backup
   ```

3. **Initialize fresh MySQL:**
   ```bash
   /opt/homebrew/opt/mysql@8.4/bin/mysqld --initialize-insecure --user=$(whoami) --basedir=/opt/homebrew/opt/mysql@8.4 --datadir=/opt/homebrew/var/mysql
   ```

4. **Start MySQL:**
   ```bash
   brew services start mysql@8.4
   ```

5. **Connect (no password):**
   ```bash
   /opt/homebrew/opt/mysql@8.4/bin/mysql -u root
   ```

6. **Set a password:**
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';
   FLUSH PRIVILEGES;
   ```

---

### Step 3: Create GetFrisch Test Database

Once you can connect to MySQL:

```bash
/opt/homebrew/opt/mysql@8.4/bin/mysql -u root -p
```

Then run:

```sql
CREATE DATABASE getfrisch_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'getfrisch_test'@'localhost' IDENTIFIED BY 'test_password_123';
GRANT ALL PRIVILEGES ON getfrisch_test.* TO 'getfrisch_test'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES LIKE 'getfrisch_test';
EXIT;
```

---

### Step 4: Update PATH (Important!)

MySQL 8.4 is "keg-only" meaning it's not in your PATH by default. Add it:

```bash
echo 'export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

Or for the current session only:
```bash
export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"
```

Now `mysql` command will work directly:
```bash
mysql -u root -p
```

---

### Step 5: Configure PyCharm Database Connection

1. Open PyCharm
2. Go to **Database** tool window (View → Tool Windows → Database)
3. Click **+** → **Data Source** → **MySQL**
4. Configure:
   - **Host**: `localhost`
   - **Port**: `3306`
   - **Database**: `getfrisch_test`
   - **User**: `getfrisch_test`
   - **Password**: `test_password_123`
5. Click **Test Connection**
6. Should now work! ✅

---

### Step 6: Update GetFrisch3 Config

Edit `/Users/jed/getfrisch3/getfrisch3/config/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=getfrisch_test
DB_USER=getfrisch_test
DB_PASSWORD=test_password_123
```

---

## Quick Test Commands

### Check if MySQL is running:
```bash
ps aux | grep mysqld | grep -v grep
```

### Check MySQL status:
```bash
brew services list | grep mysql
```

### Connect to MySQL:
```bash
mysql -u root -p
# or with full path:
/opt/homebrew/opt/mysql@8.4/bin/mysql -u root -p
```

### Test connection without password prompt:
```bash
mysql -u getfrisch_test -ptest_password_123 -e "SELECT 1;"
```

---

## Common Issues

### "mysql: command not found"
**Fix**: Add MySQL to PATH (see Step 4)

### "Access denied for user 'root'@'localhost'"
**Fix**: Use correct password or reset it (see Step 2)

### "Can't connect to local MySQL server"
**Fix**: Make sure MySQL is running:
```bash
brew services restart mysql@8.4
```

### Port 3306 already in use
**Fix**: Check if another MySQL is running:
```bash
lsof -i :3306
kill -9 <PID>
```

---

## Summary

**What was fixed:**
- ❌ MySQL 9.0.1 (incompatible upgrade) → ✅ MySQL 8.4.7 LTS
- ✅ MySQL service is now running
- ✅ Ready to create getfrisch_test database

**What you need to do:**
1. Connect to MySQL with your existing root password
2. Create getfrisch_test database
3. Configure PyCharm connection
4. Start testing!

---

## Still Having Issues?

Try the "Fresh Start" option (Step 2, Option B) if you don't need any existing databases. This will give you a clean MySQL installation with no password on root.
