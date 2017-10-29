# Koa Sample App (handlebars templating + RESTful API using MySQL, on Node.js)

> *This sample app uses Koa v2 with async/await. The previous version using Koa v1 is still available 
on the [koa-v1](../../tree/koa-v1) branch.*

This is the result of a self-learning exercise on how to put together a complete Node.js
MySQL-driven [Koa](http://koajs.com) app.

When I started with Node.js (using Express), I found plenty of tutorials & examples on individual
elements, but found it hard to stitch everything together; this was even more true with Koa. Being
new to Node / Express / Koa, I found that understanding came very much by assembling *all* the
different bits together.

While the Koa ‘[hello world](http://koajs.com/#application)’ certainly doesn’t flatter to deceive,
there’s obviously a long way to go after it. This does some of that. It is a template not a
mini-tutorial. It puts a lot of the components of a complete system together: neither mini nor
tutorial!

Having worked it all out, this is now largely a ‘note-to-self’ *aide-memoire*, but I hope it might
help others in a similar situation. No one else will be doing all the same things, but seeing
components operating together may be helpful.

It is of course simplistic, but unlike many tutorials, it assembles together many of the components
of a complete system: in this case, basic interactive tools for viewing, adding, editing, and
deleting ([CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)), with 
[JWT](https://jwt.io/)-based authentication/login, and a matching
[REST](http://en.wikipedia.org/wiki/Representational_state_transfer)ful API to do the same. Many 
systems may not require an API, but the API app can be used for RESTful ajax functions (illustrated 
in the edit member/team pages). Of course, real systems do much more, but often build on these 
core functions.

The database includes a couple of tables with related data and referential integrity – one step
beyond where most tutorials go. Hence code is included for handling basic validation and referential
integrity errors returned from the database.

Otherwise I’ve stripped it down to essentials. There’s no pretty styling! There’s no great UI. Just 
the bare building-blocks.

There are also sample integration/acceptance tests using mocha / supertest / chai.

I don’t have time to put together a full tutorial, but I’ve tried to make everything clear & well
structured, and I’ve liberally commented the code.

## Design choices

While it’s still rather leading-edge, Koa makes development far simpler than classic callback-style 
Node.js with Express. JavaScript used to be looked down on 
([misunderstood?](http://davidwalsh.name/javascript-objects)) in some quarters, but it is gaining 
understanding as a mature and valid language (the benefits of prototypal inheritance are starting to 
be appreciated, rather than seen as ‘classical inheritance got wrong’). It’s certainly vastly better 
to work with than PHP :)

The app is a classic web application, not a single-page app 
(‘[SPA](https://medium.com/@stilkov/why-i-hate-your-single-page-app-f08bb4ff9134)’).

It is built with a modular approach. There are three (*composed*) sub-apps: the bare bones of a
public site, a web-based password-protected admin system using handlebars-templated html pages, and
a REST API. Each of these is structured in a modular fashion; mostly each admin module has JavaScript
handlers to handle GET and POST requests, and a set of handlebars templates; each API module has
JavaScript handlers for GET, POST, PATCH, DELETE requests.

The highly-structured applications I work on require ACID SQL databases with referential integrity,
so MongoDB was out for me. MySQL and PostgreSQL should be pretty similar, but PostgreSQL is not yet
so well supported for Koa. [Actually, I’ve since built applications using MongoDB, sometimes 
together with MySQL for different datastores in the same application].

For some people, a full JavaScript framework will work better. If you’re happy to plan out your own
preferred structure, designing your own patterns means one less component to learn / conform to.

There’s always things others would do differently. If you have better ways of doing things, it will
either be down to my preferences, or my ignorance! If you notice anything I’ve got wrong or have
real improvements, let me know.

### Admin app

The admin app just does basic adding/editing/deleting. Any real app will do much more, but will
generally include and build on these basics.

I find [Handlebars](http://handlebarsjs.com/) offers a good minimal-logic templates (mustache is too
limiting, but I like to work with HTML).

The main *app-admin.js* sets up the database connection, handlebars templating, JWT authentication, 
4xx/500 handling, etc (JWT authentication is held in (signed) cookies, for stateless sessions).

I’ve divided the app into  routes, matching handlers/controllers, and a set of templates. The 
handlers have one function for each method/route, and either render a view, redirect (e.g. after 
POST), or throw an error.

### API

The API returns JSON or XML (or plain text) according to the *Accepts* request header.

The main *app-api.js* sets up the database connection, content negotiation, JWT authentication,  
4xx/500 handling, etc (JWT authentication is supplied in Bearer Authorization HTTP headers).

Routes are grouped into members, teams, team membership, and authentication. All but the simplest of
these then go on to call related handlers.

The *members.js* and *teams.js* then handle the API requests. I use PATCH in preference to PUT so 
that a subset of entity fields can be supplied (correctly, a PUT will set unsupplied fields to null); 
otherwise everything is very straightforward REST API, hopefully all following best practice.

Special provision is made for boolean values, which are typically stored in MySQL as BIT(1) or
TINYINT(1). In the admin section, where fields are handled individually, normal JavaScript type 
conversion rules take care of conversions between boolean and numeric values, but for the API boolean
values have to be explicitly converted between 1/0 and true/false (for both JSON and XML).

### Models

Models sit above the sub-apps, as they are used by both the admin app and the API.

I use light-weight models just to manage all operations which modify stored data in the database;
individual handlers are responsible for obtaining data they require to render their templates (using
SQL queries).

### Dependencies

While very basic, this sample app incorporates together many of the components of a real application;
as well as handlebars templates, MySQL, & JWT-managed logins, there’s static file serving, body-parser 
for post data, lusca security headers, compression, logging, flash messages, etc, and mocha/chai for 
testing (I’ve ignored i18n which would introduce considerable complexity). Full details of course in 
[package.json](/chrisveness/koa-sample-web-app-api-mysql/blob/master/package.json).

For Ajax, I use native JavaScript DOM API / fetch API rather than jQuery (e.g. `document.querySelector()`).

The app uses the database set out below, with connection details as per `.env`.

### Demo

There is a running version of the app at [koa-sample-app.movable-type.co.uk](http://koa-sample-app.movable-type.co.uk).


### Local copy

If you would like to make a local copy to experiment with, you of course need Node.js and Git 
installed, and also MySQL (with connection details as per `.env`).

You will need `admin.`, `api.`, and `www.` subdomains available; to do this, add a line such as 
`127.0.0.1 www.localhost api.localhost admin.localhost` to `/etc/hosts` (on Unix/Mac), or 
`\Windows\System32\drivers\etc\hosts` (on Windows).

In MySQL, run the [database schema](#database-schema) script to create the database, and the 
[test data](#test-data) script to populate it.

Then at the Unix command line, or using Git Bash on Windows:
````
$ git clone https://github.com/chrisveness/koa-sample-web-app-api-mysql.git
$ cd koa-sample-web-app-api-mysql
$ npm install
$ npm start
````

Then open a browser and go to `http://www.localhost:3000` to run the app.


## File structure

```
.
├── app-admin
│   ├── handlers
│   │   ├── login.js
│   │   ├── members.js
│   │   └── teams.js
│   ├── routes
│   │   ├── ajax-routes.js
│   │   ├── dev-routes.js
│   │   ├── index-routes.js
│   │   ├── login-routes.js
│   │   ├── logs-routes.js
│   │   ├── members-routes.js
│   │   └── teams-routes.js
│   ├── templates
│   │   ├── partials
│   │   │   ├── errpartial.html
│   │   │   └── navpartial.html
│   │   ├── 400-bad-request.html
│   │   ├── 404-not-found.html
│   │   ├── 500-internal-server-error.html
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── logs.html
│   │   ├── members-add.html
│   │   ├── members-delete.html
│   │   ├── members-edit.html
│   │   ├── members-list.html
│   │   ├── members-view.html
│   │   ├── teams-add.html
│   │   ├── teams-delete.html
│   │   ├── teams-edit.html
│   │   ├── teams-list.html
│   │   └── teams-view.html
│   └── app-admin.js
├── app-api
│   ├── app-api.js
│   ├── members.js
│   ├── routes-auth.js
│   ├── routes-members.js
│   ├── routes-root.js
│   ├── routes-team-members.js
│   ├── routes-teams.js
│   ├── team-members.js
│   └── teams.js
├── app-www
│   ├── templates
│   │   ├── 404-not-found.html
│   │   ├── 500-internal-server-error.html
│   │   ├── contact.html
│   │   ├── index.html
│   │   └── navpartial.html
│   ├── app-www.js
│   ├── handlers-www.js
│   └── routes-www.js
├── lib
│   └── lib.js
├── logs
├── models
│   ├── member.js
│   ├── modelerror.js
│   ├── team.js
│   ├── team-member.js
│   └── user.js
├── public
│   └── css
│       ├── admin.css
│       ├── base.css
│       └── www.css
├── test
│   ├── admin.js
│   └── api.js
├─ app.js
├─ .env
├─ LICENSE
├─ package.json
└─ README.md
```

I originally structured this in a modular fashion as suggested by [TJ](https://vimeo.com/56166857), 
but I’ve since found it more convenient to work with a flatter structure (heresy!) as I found it 
unproductive to be constantly expanding and contracting folders. Go with what works for you.

Simpler applications can use a much flatter structure still, at the limit with no sub-folders at all; 
more complex ones might use a deeper structure. “Horses for courses”, as they say.

## .env

Sensitive information  such as database login credentials, SMTP parameters, etc, are held in 
environment variables. For local development, these can be kept in a .env file (which is 
*.gitignore*’d, not checked in to a repository). For production, they will be set as environment 
variables and not stored in the file system.

A .env file for this project might look like:

    DB_HOST     = localhost
    DB_PORT     = 3306
    DB_USER     = koa-sample
    DB_PASSWORD = demo
    DB_DATABASE = koa-sample-sandbox
    
    SMTP_HOST = smtp.gmail.com
    SMTP_PORT = 587
    SMTP_USER = me@gmail.com
    SMTP_PASS = mypassword

    TESTUSER = guest@user.com
    TESTPASS = guest

## Database schema

```sql
-- Schema for ‘koa-sample-web-app-api-mysql’ app

create database `koa-sample-sandbox`;
use `koa-sample-sandbox`;

create table Member (
  MemberId  integer unsigned not null auto_increment,
  Firstname text,
  Lastname  text,
  Email     text not null,
  Active    bit(1),
  primary key       (MemberId),
  unique  key Email (Email(24))
) engine=InnoDB charset=utf8 auto_increment=100001;

create table Team (
  TeamId integer unsigned not null auto_increment,
  Name   text not null,
  primary key (TeamId)
) engine=InnoDB charset=utf8 auto_increment=100001;

create table TeamMember (
  TeamMemberId integer unsigned not null auto_increment,
  MemberId     integer unsigned not null,
  TeamId       integer unsigned not null,
  JoinedOn     date not null,
  primary key            (TeamMemberId),
  key         MemberId   (MemberId),
  key         TeamId     (TeamId),
  unique key  TeamMember (MemberId,TeamId),
  constraint Fk_Team_TeamMember   foreign key (TeamId)   references Team   (TeamId),
  constraint Fk_Member_TeamMember foreign key (MemberId) references Member (MemberId)
) engine=InnoDB charset=utf8 auto_increment=100001;

create table User (
  UserId               integer unsigned not null auto_increment,
  Firstname            text,
  Lastname             text,
  Email                text not null,
  Password             text,
  PasswordResetRequest text,
  Role                 text,
  primary key       (UserId),
  unique  key Email (Email(24))
) engine=InnoDB charset=utf8 auto_increment=100001;
```

## Test data

```sql
-- Test data for ‘koa-sample-web-app-api-mysql’ app

INSERT INTO Member VALUES 
 (100001,'Juan Manuel','Fangio','juan-manuel@fangio.com', false),
 (100002,'Ayrton','Senna','ayrton@senna.com', false),
 (100003,'Michael','Schumacher','michael@schumacher.com', false),
 (100004,'Lewis','Hamilton','lewis@hamilton.com', true);

INSERT INTO Team VALUES 
 (100001,'Ferrari'),
 (100002,'Mercedes'),
 (100003,'McLaren');
 
INSERT INTO TeamMember VALUES 
 (100001,100001,100001,'1956-01-22'),
 (100002,100001,100002,'1954-01-17'),
 (100003,100002,100003,'1988-04-03'),
 (100004,100003,100001,'1996-03-10'),
 (100005,100003,100002,'2010-03-14'),
 (100006,100004,100002,'2007-03-18'),
 (100007,100004,100003,'2013-03-17');
 
INSERT INTO User VALUES
  (100001,'Guest','User','guest@user.com','c2NyeXB0AA8AAAAIAAAAAadRWAxJ7PVQ8T6zW7orsuCiHr38TPYJ9TGVbHEK5hvdbC7lCKxKdebdo0T0wR9Aiye4GQDHbLkcBNVVQZpBDtWGfezCWZvtcw4JZ90HDuhb',null,'guest'),
  (100002,'Admin','User','admin@user.com','c2NyeXB0AA4AAAAIAAAAAfvrpUA5jkh3ObPPUPNQEjbkHXk4vj4xPWH6N8yLEvbgkKqW5zqv3AgsHtTcSL2lzfviyMkXjybHPXeqDY62ZxHEvmTgEY6THddbqOUAOzTQ',null,'admin');
```

The full sample app is around 1,000 lines of JavaScript.
