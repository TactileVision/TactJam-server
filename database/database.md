# TactJam-server database
We're using a [PostgreSQL](https://www.postgresql.org/) database with a [PostgREST](https://postgrest.org/en/v7.0.0/) server infront of it.

## PostgreSQL database
### Installation database dependencies
Please make sure to create the extension "pgcrypto" first for the database you're using.
The database scheme will not work without that extension. It's mainly used to generate a random UUID.

`CREATE EXTENSION pgcrypto;`


### SQL script
To create the database scheme please use the sql script "scheme.sql" in the sql folder.
Please note that this scheme does not add the ownership to the database.

Refer to the PostgREST [Tutorial Guide](https://postgrest.org/en/v7.0.0/tutorials/tut1.html) to set up the needed permissions.

### scheme
![Scheme](https://github.com/TactileVision/TactJam-server/database/scheme.png)