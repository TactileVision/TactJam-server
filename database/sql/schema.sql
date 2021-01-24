create table users
(
    id            uuid    default gen_random_uuid() not null
        constraint users_pk
            primary key,
    username      text                              not null,
    email         text                              not null,
    name          text                              not null,
    password      text                              not null,
    created_at    timestamp with time zone          not null,
    updated_at    timestamp with time zone          not null,
    last_login_at timestamp with time zone,
    team_id       uuid,
    banned        boolean default false             not null,
    admin         boolean default false             not null
);

comment on table users is 'table for all users';

comment on column users.id is 'random generated uuid as identifier';

comment on column users.username is 'username is used for login';

comment on column users.email is 'email can be used for password resets';

comment on column users.name is 'public name for everyone to read';

comment on column users.password is 'password hash';

comment on column users.created_at is 'date when the account was created';

comment on column users.updated_at is 'date when the account information was updated';

comment on column users.last_login_at is 'date when the user logged in the last time';

comment on column users.team_id is 'foreign key of table teams';

comment on column users.banned is 'a value to check if the user is banned or not';

create unique index users_id_uindex
    on users (id);

create unique index users_email_uindex
    on users (email);

create unique index users_username_uindex
    on users (username);

create table password_resets
(
    number      serial                   not null
        constraint password_resets_pk
            primary key,
    user_id     uuid                     not null
        constraint password_resets_users_id_fk
            references users
            on update cascade on delete cascade,
    reset_token text                     not null,
    expiry_at   timestamp with time zone not null,
    used        boolean default false    not null
);

comment on column password_resets.user_id is 'foreign key to the users table';

comment on column password_resets.reset_token is 'hash from the created token';

comment on column password_resets.expiry_at is 'date where the password reset will get invalid';

comment on column password_resets.used is 'log if it is used already';

create unique index password_resets_number_uindex
    on password_resets (number);

create table email_updates
(
    number            serial                   not null
        constraint email_updates_pk
            primary key,
    user_id           uuid                     not null,
    old_email         text,
    new_email         text                     not null,
    confirm_expiry_at timestamp with time zone not null,
    token             text                     not null,
    confirmed         boolean default false    not null,
    current           boolean default false    not null
);

comment on column email_updates.user_id is 'foreign key to table users';

comment on column email_updates.old_email is 'log of the old email';

comment on column email_updates.new_email is 'new email to add to user if confirmed';

comment on column email_updates.confirm_expiry_at is 'date where the token / transaction will get invalid';

comment on column email_updates.token is 'hash of the email token used to confirming the email';

comment on column email_updates.confirmed is 'Was the email changed from old to now?';

comment on column email_updates.current is 'indicated that this email is the current one';

create unique index email_updates_number_uindex
    on email_updates (number);

create unique index email_updates_token_uindex
    on email_updates (token);

create table tactons
(
    id          uuid default gen_random_uuid() not null
        constraint tactons_pk
            primary key,
    user_id     uuid
        constraint tactons_users_id_fk
            references users
            on update cascade on delete cascade,
    title       text                           not null,
    description text,
    libvtp_path text                           not null
);

comment on column tactons.user_id is 'FK from table users';

comment on column tactons.title is 'title of the tacton';

comment on column tactons.description is 'description for the tacton';

comment on column tactons.libvtp_path is 'datapath/name to the binary libvtp file';

create unique index tactons_id_uindex
    on tactons (id);

create table tags
(
    id         serial not null
        constraint tags_pk
            primary key,
    name       text   not null,
    creator_id uuid   not null
        constraint tags_users_id_fk
            references users
            on update cascade on delete cascade
);

create unique index tags_id_uindex
    on tags (id);

create unique index tags_name_uindex
    on tags (name);

create table motor_positions
(
    id        serial    not null
        constraint motor_positions_pk
            primary key,
    tacton_id uuid      not null
        constraint motor_positions_tactons_id_fk
            references tactons
            on update cascade on delete cascade,
    x         numeric[] not null,
    y         numeric[] not null,
    z         numeric[] not null
);

create unique index motor_positions_id_uindex
    on motor_positions (id);

create table body_tags
(
    id         serial not null
        constraint body_tags_pk
            primary key,
    name       text   not null,
    creator_id uuid   not null
        constraint body_tags_users_id_fk
            references users
);

create unique index body_tags_id_uindex
    on body_tags (id);

create unique index body_tags_name_uindex
    on body_tags (name);

create table teams
(
    id         uuid default gen_random_uuid() not null
        constraint teams_pk
            primary key,
    name       text                           not null,
    creator_id uuid                           not null
        constraint teams_users_id_fk
            references users
            on update cascade on delete cascade
);

alter table users
    add constraint users_teams_id_fk
        foreign key (team_id) references teams
            on update cascade on delete cascade;

create unique index teams_id_uindex
    on teams (id);

create unique index teams_name_uindex
    on teams (name);

create table tacton_tag_link
(
    id        serial  not null
        constraint user_tag_link_pk
            primary key,
    tacton_id uuid    not null
        constraint tacton_tag_link_tactons_id_fk
            references tactons
            on update cascade on delete cascade,
    tag_id    integer not null
        constraint user_tag_link_tags_id_fk
            references tags
            on update cascade on delete cascade
);

comment on column tacton_tag_link.tacton_id is 'foreign key from table users';

comment on column tacton_tag_link.tag_id is 'foreign key from talbe tags';

create unique index user_tag_link_id_uindex
    on tacton_tag_link (id);

create table tacton_bodytag_link
(
    id         serial  not null
        constraint tacton_bodytag_link_pk
            primary key,
    bodytag_id integer not null
        constraint tacton_bodytag_link_body_tags_id_fk
            references body_tags
            on update cascade on delete cascade,
    tacton_id  uuid    not null
        constraint tacton_bodytag_link_tactons_id_fk
            references tactons
            on update cascade on delete cascade
);

comment on column tacton_bodytag_link.bodytag_id is 'foreign key of table bodytags';

comment on column tacton_bodytag_link.tacton_id is 'foreign key of table tactons';

create unique index tacton_bodytag_link_id_uindex
    on tacton_bodytag_link (id);
