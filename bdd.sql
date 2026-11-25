-- =====================================================================
--  CineHub : bdd.sql
--
--  1. Création de la base de données
--  2. Création des 5 tables (avec contraintes)
--  3. Création de l'utilisateur MySQL + GRANT + FLUSH PRIVILEGES
--  4. Compte admin de démonstration
--  5. Données de test : films, salles, séances
--
--  Import (depuis le dossier du projet) :
--      mysql -u root -p --default-character-set=utf8mb4
--      mysql> source bdd.sql
--
--  ATTENTION : la base "cinehub" est SUPPRIMEE puis recréée à chaque import.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Base de données
-- ---------------------------------------------------------------------
DROP DATABASE IF EXISTS cinehub;
CREATE DATABASE cinehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinehub;

-- ---------------------------------------------------------------------
-- 2. Tables
--
-- Suppression en cascade (ON DELETE CASCADE) :
--   - supprimer un film         -> supprime ses séances (et leurs réservations)
--   - supprimer une salle       -> supprime ses séances (et leurs réservations)
--   - supprimer une séance      -> supprime ses réservations
--   - supprimer un utilisateur  -> supprime ses réservations
--
-- L'API fait aussi ces suppressions elle-même (Models/*.model.js, dans une transaction) :
-- elle fonctionne donc même avec des tables créées sans ON DELETE CASCADE.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  us_id        INT           NOT NULL AUTO_INCREMENT,
  us_username  VARCHAR(255)  NOT NULL,
  us_password  TEXT          NOT NULL,
  us_email     VARCHAR(255)  NOT NULL,
  us_role      ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  PRIMARY KEY (us_id),
  UNIQUE KEY uq_users_username (us_username),
  UNIQUE KEY uq_users_email (us_email)
) ENGINE=InnoDB;

CREATE TABLE films (
  fi_id            INT           NOT NULL AUTO_INCREMENT,
  fi_title         VARCHAR(255)  NOT NULL,
  fi_description   TEXT          NULL,
  fi_duration      INT           NOT NULL COMMENT 'Durée en minutes',
  fi_genre         VARCHAR(100)  NULL,
  fi_release_date  DATE          NULL,
  fi_is_showing    TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (fi_id)
) ENGINE=InnoDB;

CREATE TABLE rooms (
  ro_id        INT           NOT NULL AUTO_INCREMENT,
  ro_name      VARCHAR(100)  NOT NULL,
  ro_capacity  INT           NOT NULL,
  PRIMARY KEY (ro_id),
  UNIQUE KEY uq_rooms_name (ro_name)
) ENGINE=InnoDB;

CREATE TABLE screenings (
  sc_id        INT           NOT NULL AUTO_INCREMENT,
  sc_film      INT           NOT NULL,
  sc_room      INT           NOT NULL,
  sc_datetime  DATETIME      NOT NULL,
  sc_price     DECIMAL(6,2)  NOT NULL,
  PRIMARY KEY (sc_id),
  CONSTRAINT fk_screenings_film FOREIGN KEY (sc_film) REFERENCES films (fi_id) ON DELETE CASCADE,
  CONSTRAINT fk_screenings_room FOREIGN KEY (sc_room) REFERENCES rooms (ro_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reservations (
  re_id          INT       NOT NULL AUTO_INCREMENT,
  re_user        INT       NOT NULL,
  re_screening   INT       NOT NULL,
  re_seats       INT       NOT NULL DEFAULT 1,
  re_created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (re_id),
  -- Un utilisateur ne peut réserver qu'une seule fois la même séance
  UNIQUE KEY uq_reservations_user_screening (re_user, re_screening),
  CONSTRAINT fk_reservations_user      FOREIGN KEY (re_user)      REFERENCES users (us_id)      ON DELETE CASCADE,
  CONSTRAINT fk_reservations_screening FOREIGN KEY (re_screening) REFERENCES screenings (sc_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. Utilisateur MySQL dédié à l'API (droits limités au CRUD)
--    Son mot de passe doit être le même que DB_PASSWORD dans le fichier .env
-- ---------------------------------------------------------------------
DROP USER IF EXISTS 'cine_user'@'localhost';
CREATE USER 'cine_user'@'localhost' IDENTIFIED BY 'cine_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON cinehub.* TO 'cine_user'@'localhost';
FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------
-- 4. Compte admin de démonstration
--    username : admin        mot de passe : admin123
--    (le mot de passe est stocké haché avec bcrypt, jamais en clair)
--
--    Pour générer un autre hash :
--      node -e "console.log(require('bcrypt').hashSync('MON_MOT_DE_PASSE', 10))"
-- ---------------------------------------------------------------------
INSERT INTO users (us_username, us_password, us_email, us_role) VALUES
  ('admin', '$2b$10$dDOui9hma6WCW/qYJ9PFMOBszXx5DgJPb5milKL5ns1lu5WdIMjsm', 'admin@cinehub.fr', 'admin');

-- ---------------------------------------------------------------------
-- 5. Données de test
-- ---------------------------------------------------------------------
INSERT INTO films (fi_title, fi_description, fi_duration, fi_genre, fi_release_date, fi_is_showing) VALUES
  ('Inception', 'Un voleur s''infiltre dans les rêves pour y dérober des secrets.', 148, 'Science-fiction', '2010-07-21', 1),
  ('Interstellar', 'Des explorateurs traversent un trou de ver pour sauver l''humanité.', 169, 'Science-fiction', '2014-11-05', 1),
  ('Le Fabuleux Destin d''Amélie Poulain', 'Une jeune serveuse parisienne décide de changer la vie de ceux qui l''entourent.', 122, 'Comédie', '2001-04-25', 1),
  ('Parasite', 'Une famille pauvre s''infiltre peu à peu dans la vie d''une famille riche.', 132, 'Thriller', '2019-05-30', 1),
  ('Dune', 'Le jeune Paul Atréides part pour Arrakis, une planète désertique très convoitée.', 155, 'Science-fiction', '2021-09-15', 1),
  ('Titanic', 'Une histoire d''amour à bord du paquebot condamné.', 194, 'Drame', '1997-12-19', 0);

INSERT INTO rooms (ro_name, ro_capacity) VALUES
  ('Salle 1', 120),
  ('Salle 2', 80),
  ('Salle VIP', 10);

-- Les dates sont calculées à partir d'aujourd'hui : les séances sont toujours "à venir",
-- sauf la dernière (hier), pratique pour vérifier qu'elle n'apparaît pas dans GET /films/:id.
INSERT INTO screenings (sc_film, sc_room, sc_datetime, sc_price) VALUES
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '20:30:00'), 9.50),
  (1, 2, TIMESTAMP(CURDATE() + INTERVAL 2 DAY, '18:00:00'), 8.00),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 2 DAY, '21:00:00'), 9.50),
  (3, 2, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '16:00:00'), 7.50),
  (4, 3, TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '19:00:00'), 12.00),
  (5, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '20:00:00'), 10.00),
  (1, 1, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '20:30:00'), 9.50);
