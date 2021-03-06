
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS master AUTHORIZATION ipdv;
SET check_function_bodies = false;
--
-- Structure for table tb_usuarios (OID = 17673) :
--
SET search_path = master, pg_catalog;

--TABELA DE STATUS DO USUÁRIO (ATIVO,DESLIGADO,FÉRIAS...)
CREATE TABLE IF NOT EXISTS master.tb_users_status(
	status_id serial not null PRIMARY KEY,
    status VARCHAR(100) not null UNIQUE,
    desc_status VARCHAR(300) null
);

--TABELA DE CARGOS, FUNÇÕES
CREATE TABLE IF NOT EXISTS master.tb_roles(
	roles_id serial not null PRIMARY KEY,
    role VARCHAR(100) not null UNIQUE
);

--TABELA DE LICENÇAS
CREATE TABLE IF NOT EXISTS master.tb_licenses(
	licence_id serial not null PRIMARY KEY,
    licence VARCHAR(50) not null UNIQUE
);

--TABELA DE SETORES, VAGAS
CREATE TABLE IF NOT EXISTS master.tb_sectors(
	sector_id serial not null PRIMARY KEY,
    role_id integer not null REFERENCES master.tb_roles (roles_id),
    sector VARCHAR(20) not null UNIQUE
);

--TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS master.tb_users (
    user_id serial NOT NULL PRIMARY key,
    status_id integer not null REFERENCES master.tb_users_status (status_id),
    licence_id integer not null UNIQUE REFERENCES master.tb_licenses (licence_id),
    client_code varchar(20) NULL UNIQUE,
    "name" varchar(300) NOT NULL,
    document_type1 varchar(11) NULL CHECK(document_type1 IN('CPF','RG','SSN','CURP')),
    document_number1 varchar(50) NULL UNIQUE CHECK(
    	(document_type1 IS NULL AND document_number1 IS NULL) OR
        (document_type1 IS NOT NULL AND document_number1 IS NOT NULL)
    ),
    document_type2 varchar(11) NULL CHECK(document_type1 IN('CPF','RG','SSN','CURP')),
    document_number2 varchar(50) NULL UNIQUE CHECK(
    	(document_type2 IS NULL AND document_number2 IS NULL) OR
        (document_type2 IS NOT NULL AND document_number2 IS NOT NULL)
    ),
    email varchar(200) NOT NULL UNIQUE,
    "login" varchar(200) NOT NULL UNIQUE,
    home_phone varchar(20) NULL,
    cell_phone varchar(20) NULL,
    address varchar(300) NULL,
    number varchar(10) NULL,
    district varchar(200) NULL,
    city varchar(200) NULL,
    state varchar(200) NOT NULL,
    state_code varchar(2) NULL,
    postal_code varchar(20)NULL,
    country varchar(100) NOT NULL,
    latitude double precision NULL,
    longitude double precision NULL,
    days_expire_password integer NULL,
    dt_created timestamp(0) without time zone DEFAULT now() NOT NULL,
    dt_update timestamp(0) NULL,
    user_id_owner integer NOT NULL
);


--TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS master.tb_logins(
    login_id serial NOT NULL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES master.tb_users (user_id),
    "password" varchar(100) NOT NULL,
    incorrect_password_number INTEGER NOT NULL DEFAULT 0,
    flag_locked_password boolean NOT NULL DEFAULT false,
    dt_created timestamp without time zone DEFAULT now() NOT NULL,
    dt_expiry date NULL,
    dt_modify timestamp NULL,
    user_id_owner integer NOT NULL REFERENCES master.tb_users (user_id)
);

--TABELA DE USUÁRIOS SETORES
CREATE TABLE IF NOT EXISTS master.tb_users_sectors(
    user_id integer NOT NULL REFERENCES master.tb_users (user_id),
    sector_id integer NOT NULL REFERENCES master.tb_sectors (sector_id),
    user_sector_id serial NOT NULL,
    dt_created timestamp NOT NULL DEFAULT now(),
    dt_update date NULL,
    user_id_owner integer NOT NULL REFERENCES master.tb_users (user_id),
    CONSTRAINT pk_tb_users_sectors PRIMARY KEY (user_id, sector_id)
);

--TABELA DE MENUS
CREATE TABLE IF NOT EXISTS master.tb_menus(
    menu_id serial NOT NULL PRIMARY KEY,
    menu varchar(200) NOT NULL,
    dt_created timestamp NOT NULL DEFAULT now(),
    dt_update date NULL
);

--TABELA DE USUÁRIOS SETORES
CREATE TABLE IF NOT EXISTS master.tb_access_log(
    log_id serial NOT NULL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES master.tb_users (user_id),
    menu_id integer NOT NULL REFERENCES master.tb_menus (menu_id),
    access_key varchar(100) NOT NULL UNIQUE DEFAULT UPPER(cast(master.uuid_generate_v4() as text)),
    dt_created timestamp NOT NULL DEFAULT now()
);

--INSERE OS REGISTROS PRINCIPAIS

INSERT INTO master.tb_menus(menu)
VALUES
    ('LOGIN'),
    ('LOGOUT');

INSERT INTO  master.tb_users_status(status)
VALUES 
	('ATIVO'),
    ('DESLIGADO'),
    ('FÉRIAS'),
    ('LICENÇA MATERNIDADE'),
    ('LICENÇA TRABALHISTA'),
    ('FOLGA');

INSERT INTO master.tb_licenses(licence)
VALUES 
    (UPPER(cast(master.uuid_generate_v4() as text)));

INSERT INTO master.tb_roles(role)
VALUES 
    ('ADM MASTER');

INSERT INTO master.tb_sectors(role_id,sector)
VALUES 
    (1,'SETOR_1A');

INSERT INTO master.tb_users(
    status_id,
    licence_id,
    name,
    document_type1,
    document_number1,
    email,
    login,
    home_phone,
    cell_phone,
    city,
    state,
    state_code,
    postal_code,
    country,
    latitude,
    longitude,
    user_id_owner
)
VALUES 
(
    1,
    1,
    'USER MASTER',
    'CPF',
    '99988877755',
    'leticia@ipdvonline.com.br',
    'leticia@ipdvonline.com.br',
    '1144225566',
    '11987875566',
    'SÃO PAULO',
    'SÃO PAULO',
    'SP',
    '04117040',
    'BRASIL',
    -23.628737,
    -46.710979,
    1
);

INSERT INTO master.tb_users_sectors (user_id,sector_id,user_id_owner)
VALUES 
    (1,1,1);

INSERT INTO master.tb_logins
(
  user_id,
  password,
  flag_locked_password,
  dt_expiry,
  user_id_owner
)
VALUES (
  1,
  UPPER(encode(sha256('1234'),'hex')),
  FALSE,
  date(now()),
  1
);