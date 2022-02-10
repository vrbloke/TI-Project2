import sqlite3 as sql

dbpath = 'app.db'

query = """
CREATE TABLE "user"
(
 "id"       integer NOT NULL,
 username text NOT NULL,
 password text NOT NULL,
 CONSTRAINT PK_7 PRIMARY KEY ( "id" )
);

CREATE TABLE habit
(
 "id"        integer NOT NULL,
 userID    integer NOT NULL,
 name      text NOT NULL,
 startDate text NOT NULL,
 frequency integer NOT NULL,
 CONSTRAINT PK_11 PRIMARY KEY ( "id" ),
 CONSTRAINT FK_17 FOREIGN KEY ( userID ) REFERENCES "user" ( "id" )
);

CREATE INDEX FK_19 ON habit
(
 userID
);

CREATE TABLE activity
(
 "id"      integer NOT NULL,
 "date"    text NOT NULL,
 habitID integer NOT NULL,
 CONSTRAINT PK_22 PRIMARY KEY ( "id" ),
 CONSTRAINT FK_24 FOREIGN KEY ( habitID ) REFERENCES habit ( "id" )
);

CREATE INDEX FK_26 ON activity
(
 habitID
);
"""

con = sql.connect(dbpath)
cur = con.cursor()
cur.executescript(query)
con.commit()
con.close()