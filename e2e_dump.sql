--
-- PostgreSQL database dump
--

\restrict sZCiPHjXZa3pgVJKLsdvomIgfH9CP9kVwcPtI7OWr9H3FaPhfkICwODsk44TOAE

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-01-05 14:24:09

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5626 (class 1262 OID 30557)
-- Name: FakeRestaurant; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE "FakeRestaurant" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'Italian_Italy.1252';


ALTER DATABASE "FakeRestaurant" OWNER TO postgres;

\unrestrict sZCiPHjXZa3pgVJKLsdvomIgfH9CP9kVwcPtI7OWr9H3FaPhfkICwODsk44TOAE
\connect "FakeRestaurant"
\restrict sZCiPHjXZa3pgVJKLsdvomIgfH9CP9kVwcPtI7OWr9H3FaPhfkICwODsk44TOAE

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5627 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 232 (class 1255 OID 30689)
-- Name: auto_upvote_restaurant(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_upvote_restaurant() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Inserisce un voto positivo per il ristorante appena creato
    INSERT INTO restaurant_votes (user_id, restaurant_id, vote)
    VALUES (NEW.user_id, NEW.id, 1::SMALLINT)
    ON CONFLICT (user_id, restaurant_id) DO NOTHING;  -- evita errori se per qualche motivo il voto esiste già
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_upvote_restaurant() OWNER TO postgres;

--
-- TOC entry 233 (class 1255 OID 30691)
-- Name: auto_upvote_review(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_upvote_review() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Inserisce un voto positivo per la recensione appena creata
    INSERT INTO review_votes (user_id, review_id, vote)
    VALUES (NEW.user_id, NEW.id, 1::SMALLINT)
    ON CONFLICT (user_id, review_id) DO NOTHING;  -- evita errori se il voto esiste già
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_upvote_review() OWNER TO postgres;

--
-- TOC entry 234 (class 1255 OID 47817)
-- Name: cleanup_old_reset_tokens(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_reset_tokens() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cancella tutti i token appartenenti allo stesso utente,
    -- tranne quello appena creato
    DELETE FROM password_reset_tokens
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_old_reset_tokens() OWNER TO postgres;

--
-- TOC entry 235 (class 1255 OID 69479)
-- Name: cleanup_old_restaurant_vote_notif(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_restaurant_vote_notif() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Elimina la vecchia notifica se esiste
    DELETE FROM notifications
    WHERE user_id = (SELECT user_id FROM restaurants WHERE id = NEW.restaurant_id)
      AND actor_id = NEW.user_id
      AND target_type = 'restaurant'
      AND target_id = NEW.restaurant_id
      AND type IN ('upvote', 'downvote');

    -- Inserisce la nuova notifica con created_at forzato
    IF NEW.user_id <> (SELECT user_id FROM restaurants WHERE id = NEW.restaurant_id) THEN
        INSERT INTO notifications(user_id, type, actor_id, target_type, target_id, created_at)
        VALUES (
            (SELECT user_id FROM restaurants WHERE id = NEW.restaurant_id),
            CASE WHEN NEW.vote = 1 THEN 'upvote' ELSE 'downvote' END,
            NEW.user_id,
            'restaurant',
            NEW.restaurant_id,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_old_restaurant_vote_notif() OWNER TO postgres;

--
-- TOC entry 255 (class 1255 OID 69477)
-- Name: cleanup_old_review_vote_notif(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_review_vote_notif() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM notifications
    WHERE user_id = (SELECT user_id FROM reviews WHERE id = NEW.review_id)
      AND actor_id = NEW.user_id
      AND target_type = 'review'
      AND target_id = NEW.review_id
      AND type IN ('upvote', 'downvote');

    -- Inserisce la nuova notifica con created_at forzato
    IF NEW.user_id <> (SELECT user_id FROM reviews WHERE id = NEW.review_id) THEN
        INSERT INTO notifications(user_id, type, actor_id, target_type, target_id, created_at)
        VALUES (
            (SELECT user_id FROM reviews WHERE id = NEW.review_id),
            CASE WHEN NEW.vote = 1 THEN 'upvote' ELSE 'downvote' END,
            NEW.user_id,
            'review',
            NEW.review_id,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_old_review_vote_notif() OWNER TO postgres;

--
-- TOC entry 236 (class 1255 OID 70135)
-- Name: delete_restaurant_vote_notification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_restaurant_vote_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM notifications
    WHERE actor_id = OLD.user_id
      AND target_type = 'restaurant'
      AND target_id = OLD.restaurant_id
      AND type IN ('upvote', 'downvote');

    RETURN OLD;
END;
$$;


ALTER FUNCTION public.delete_restaurant_vote_notification() OWNER TO postgres;

--
-- TOC entry 252 (class 1255 OID 69481)
-- Name: delete_review_notifications(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_review_notifications() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM notifications
    WHERE target_type = 'review'
      AND target_id = OLD.id;

    RETURN OLD;
END;
$$;


ALTER FUNCTION public.delete_review_notifications() OWNER TO postgres;

--
-- TOC entry 237 (class 1255 OID 70137)
-- Name: delete_review_vote_notification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_review_vote_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM notifications
    WHERE actor_id = OLD.user_id
      AND target_type = 'review'
      AND target_id = OLD.review_id
      AND type IN ('upvote', 'downvote');

    RETURN OLD;
END;
$$;


ALTER FUNCTION public.delete_review_vote_notification() OWNER TO postgres;

--
-- TOC entry 238 (class 1255 OID 70139)
-- Name: lock_created_at_restaurants(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lock_created_at_restaurants() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.created_at := OLD.created_at;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.lock_created_at_restaurants() OWNER TO postgres;

--
-- TOC entry 254 (class 1255 OID 70133)
-- Name: notif_delete_notify(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notif_delete_notify() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Invia al backend: "delete:<id>"
    PERFORM pg_notify('notifications_channel', 'delete:' || OLD.id);
    RETURN OLD;
END;
$$;


ALTER FUNCTION public.notif_delete_notify() OWNER TO postgres;

--
-- TOC entry 253 (class 1255 OID 70131)
-- Name: notif_insert_notify(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notif_insert_notify() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Invia al backend: "insert:<id>"
    PERFORM pg_notify('notifications_channel', 'insert:' || NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.notif_insert_notify() OWNER TO postgres;

--
-- TOC entry 250 (class 1255 OID 30696)
-- Name: notify_review_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_review_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    restaurant_owner INT;
    parent_author INT;
BEGIN
    -- proprietario del ristorante
    SELECT user_id INTO restaurant_owner
    FROM restaurants
    WHERE id = NEW.restaurant_id;

    -- 1) NUOVA RECENSIONE PRINCIPALE
    IF NEW.parent_review_id IS NULL THEN

        IF NEW.user_id <> restaurant_owner THEN
            INSERT INTO notifications(user_id, type, actor_id, target_type, target_id, created_at)
            VALUES (
                restaurant_owner,
                'new_review',
                NEW.user_id,
                'review',
                NEW.id,
                NOW()
            );
        END IF;

    -- 2) RISPOSTA A UNA RECENSIONE
    ELSE
        SELECT user_id INTO parent_author
        FROM reviews
        WHERE id = NEW.parent_review_id;

        IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
            INSERT INTO notifications(user_id, type, actor_id, target_type, target_id, created_at)
            VALUES (
                parent_author,
                'reply',
                NEW.user_id,
                'review',
                NEW.id,
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_review_activity() OWNER TO postgres;

--
-- TOC entry 251 (class 1255 OID 67445)
-- Name: notify_vote(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_vote() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    target_user INT;
    notif_type VARCHAR(50);
BEGIN
    IF TG_TABLE_NAME = 'restaurant_votes' THEN
        SELECT user_id INTO target_user
        FROM restaurants
        WHERE id = NEW.restaurant_id;

        notif_type := CASE
            WHEN NEW.vote = 1 THEN 'upvote'
            ELSE 'downvote'
        END;

        IF NEW.user_id <> target_user THEN
            INSERT INTO notifications(user_id, type, actor_id, target_type, target_id, created_at)
            VALUES (target_user, notif_type, NEW.user_id, 'restaurant', NEW.restaurant_id, NOW());
        END IF;

    ELSIF TG_TABLE_NAME = 'review_votes' THEN
        SELECT user_id INTO target_user
        FROM reviews
        WHERE id = NEW.review_id;

        notif_type := CASE
            WHEN NEW.vote = 1 THEN 'upvote'
            ELSE 'downvote'
        END;

        IF NEW.user_id <> target_user THEN
            INSERT INTO notifications(user_id, type, actor_id, target_type, target_id, created_at)
            VALUES (target_user, notif_type, NEW.user_id, 'review', NEW.review_id, NOW());
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_vote() OWNER TO postgres;

--
-- TOC entry 231 (class 1255 OID 30687)
-- Name: update_review_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_review_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.content IS DISTINCT FROM OLD.content THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_review_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 228 (class 1259 OID 30654)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    actor_id integer NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id integer NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 30653)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 5628 (class 0 OID 0)
-- Dependencies: 227
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 230 (class 1259 OID 30673)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 30672)
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5629 (class 0 OID 0)
-- Dependencies: 229
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- TOC entry 224 (class 1259 OID 30612)
-- Name: restaurant_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurant_votes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    restaurant_id integer NOT NULL,
    vote smallint NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT restaurant_votes_vote_check CHECK ((vote = ANY (ARRAY[1, '-1'::integer])))
);


ALTER TABLE public.restaurant_votes OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 30611)
-- Name: restaurant_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.restaurant_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.restaurant_votes_id_seq OWNER TO postgres;

--
-- TOC entry 5630 (class 0 OID 0)
-- Dependencies: 223
-- Name: restaurant_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.restaurant_votes_id_seq OWNED BY public.restaurant_votes.id;


--
-- TOC entry 220 (class 1259 OID 30571)
-- Name: restaurants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurants (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    image_url character varying(255),
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.restaurants OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 30570)
-- Name: restaurants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.restaurants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.restaurants_id_seq OWNER TO postgres;

--
-- TOC entry 5631 (class 0 OID 0)
-- Dependencies: 219
-- Name: restaurants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.restaurants_id_seq OWNED BY public.restaurants.id;


--
-- TOC entry 226 (class 1259 OID 30633)
-- Name: review_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_votes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    review_id integer NOT NULL,
    created_at timestamp with time zone,
    vote smallint NOT NULL,
    CONSTRAINT review_votes_vote_check CHECK ((vote = ANY (ARRAY[1, '-1'::integer])))
);


ALTER TABLE public.review_votes OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 30632)
-- Name: review_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.review_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.review_votes_id_seq OWNER TO postgres;

--
-- TOC entry 5632 (class 0 OID 0)
-- Dependencies: 225
-- Name: review_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.review_votes_id_seq OWNED BY public.review_votes.id;


--
-- TOC entry 222 (class 1259 OID 30586)
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    user_id integer NOT NULL,
    restaurant_id integer NOT NULL,
    content text NOT NULL,
    parent_review_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 30585)
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_id_seq OWNER TO postgres;

--
-- TOC entry 5633 (class 0 OID 0)
-- Dependencies: 221
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- TOC entry 218 (class 1259 OID 30559)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    icon_id integer,
    CONSTRAINT users_icon_id_check CHECK (((icon_id >= 1) AND (icon_id <= 15)))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 30558)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5634 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4791 (class 2604 OID 30657)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4793 (class 2604 OID 30676)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- TOC entry 4789 (class 2604 OID 30615)
-- Name: restaurant_votes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_votes ALTER COLUMN id SET DEFAULT nextval('public.restaurant_votes_id_seq'::regclass);


--
-- TOC entry 4787 (class 2604 OID 30574)
-- Name: restaurants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants ALTER COLUMN id SET DEFAULT nextval('public.restaurants_id_seq'::regclass);


--
-- TOC entry 4790 (class 2604 OID 30636)
-- Name: review_votes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_votes ALTER COLUMN id SET DEFAULT nextval('public.review_votes_id_seq'::regclass);


--
-- TOC entry 4788 (class 2604 OID 30589)
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- TOC entry 4786 (class 2604 OID 30562)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5618 (class 0 OID 30654)
-- Dependencies: 228
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.notifications VALUES (70, 3, 'upvote', 21, 'review', 2, false, '2025-12-15 15:38:35.455433+01') ON CONFLICT DO NOTHING;
INSERT INTO public.notifications VALUES (72, 9, 'downvote', 21, 'review', 8, false, '2025-12-15 15:44:35.603154+01') ON CONFLICT DO NOTHING;
INSERT INTO public.notifications VALUES (73, 16, 'new_review', 21, 'review', 113, true, '2025-12-15 15:47:20.401034+01') ON CONFLICT DO NOTHING;
INSERT INTO public.notifications VALUES (74, 21, 'upvote', 16, 'review', 113, true, '2025-12-15 15:47:30.168772+01') ON CONFLICT DO NOTHING;
INSERT INTO public.notifications VALUES (75, 1, 'new_review', 21, 'review', 115, false, '2025-12-17 11:02:25.029969+01') ON CONFLICT DO NOTHING;
INSERT INTO public.notifications VALUES (77, 1, 'upvote', 16, 'restaurant', 1, false, '2025-12-22 11:47:14.96065+01') ON CONFLICT DO NOTHING;


--
-- TOC entry 5620 (class 0 OID 30673)
-- Dependencies: 230
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.password_reset_tokens VALUES (20, 16, '887a5da9-4880-4457-ae1a-375ec2fc61c1', '2025-12-11 17:58:03.838+01') ON CONFLICT DO NOTHING;


--
-- TOC entry 5614 (class 0 OID 30612)
-- Dependencies: 224
-- Data for Name: restaurant_votes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.restaurant_votes VALUES (1, 1, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (2, 1, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (3, 2, 3, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (4, 2, 4, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (5, 3, 5, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (6, 3, 6, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (7, 4, 7, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (8, 4, 8, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (9, 5, 9, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (10, 5, 10, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (11, 6, 11, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (12, 6, 12, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (13, 7, 13, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (14, 7, 14, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (15, 8, 15, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (16, 8, 16, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (17, 9, 17, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (18, 9, 18, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (19, 10, 19, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (20, 10, 20, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (21, 11, 21, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (22, 11, 22, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (23, 12, 23, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (24, 12, 24, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (25, 2, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (26, 3, 1, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (27, 4, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (28, 5, 1, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (29, 6, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (30, 7, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (31, 8, 1, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (32, 9, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (33, 10, 1, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (34, 11, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (35, 12, 1, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (36, 2, 2, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (37, 3, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (38, 4, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (39, 5, 2, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (40, 6, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (41, 7, 2, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (42, 8, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (43, 9, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (44, 10, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (45, 11, 2, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (46, 12, 2, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (47, 1, 3, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (48, 4, 3, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (49, 5, 3, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (50, 6, 3, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (51, 7, 3, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (52, 8, 3, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (53, 9, 3, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (54, 10, 3, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (55, 1, 4, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (56, 3, 4, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (57, 5, 4, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (58, 6, 4, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (59, 7, 4, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (60, 8, 4, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (61, 9, 4, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (62, 12, 4, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (63, 1, 5, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (64, 2, 5, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (65, 4, 5, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (66, 6, 5, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (67, 7, 5, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (68, 8, 5, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (69, 9, 5, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (70, 11, 5, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (71, 1, 6, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (72, 2, 6, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (73, 4, 6, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (74, 5, 6, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (75, 7, 6, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (76, 9, 6, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (77, 10, 6, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (78, 12, 6, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (79, 1, 7, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (80, 2, 7, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (81, 3, 7, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (82, 5, 7, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (83, 6, 7, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (84, 8, 7, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (85, 10, 7, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (86, 11, 7, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (87, 1, 8, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (88, 2, 8, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (89, 3, 8, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (90, 5, 8, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (91, 6, 8, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (92, 7, 8, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (93, 9, 8, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (94, 12, 8, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (95, 1, 9, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (96, 2, 9, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (97, 3, 9, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (98, 4, 9, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (99, 6, 9, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (100, 7, 9, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (101, 10, 9, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (102, 12, 9, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (103, 1, 10, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (104, 2, 10, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (105, 3, 10, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (106, 4, 10, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (107, 6, 10, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (108, 8, 10, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (109, 9, 10, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (110, 11, 10, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (111, 1, 11, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (112, 2, 11, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (113, 3, 11, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (114, 4, 11, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (115, 5, 11, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (116, 7, 11, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (117, 8, 11, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (118, 12, 11, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (119, 1, 12, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (120, 2, 12, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (121, 3, 12, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (122, 4, 12, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (123, 5, 12, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (124, 9, 12, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (125, 10, 12, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (126, 11, 12, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (127, 1, 13, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (128, 2, 13, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (129, 3, 13, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (130, 4, 13, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (131, 5, 13, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (132, 6, 13, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (133, 8, 13, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (134, 10, 13, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (135, 1, 14, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (136, 2, 14, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (137, 3, 14, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (138, 5, 14, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (139, 6, 14, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (140, 9, 14, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (141, 12, 14, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (142, 1, 15, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (143, 2, 15, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (144, 3, 15, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (145, 4, 15, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (146, 5, 15, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (147, 7, 15, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (148, 10, 15, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (149, 11, 15, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (150, 1, 16, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (151, 2, 16, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (152, 3, 16, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (153, 5, 16, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (154, 6, 16, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (155, 9, 16, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (156, 12, 16, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (157, 1, 17, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (158, 2, 17, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (159, 3, 17, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (160, 4, 17, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (161, 6, 17, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (162, 7, 17, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (163, 11, 17, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (164, 1, 18, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (165, 2, 18, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (166, 3, 18, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (167, 5, 18, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (168, 6, 18, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (169, 8, 18, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (170, 10, 18, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (171, 12, 18, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (172, 1, 19, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (173, 2, 19, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (174, 3, 19, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (175, 4, 19, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (176, 5, 19, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (177, 7, 19, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (178, 9, 19, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (179, 11, 19, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (180, 1, 20, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (181, 2, 20, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (182, 3, 20, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (183, 5, 20, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (184, 6, 20, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (185, 8, 20, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (186, 12, 20, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (187, 1, 21, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (188, 2, 21, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (189, 3, 21, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (190, 4, 21, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (191, 5, 21, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (192, 6, 21, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (193, 8, 21, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (194, 10, 21, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (195, 1, 22, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (196, 2, 22, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (197, 3, 22, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (198, 5, 22, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (199, 6, 22, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (200, 7, 22, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (201, 9, 22, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (202, 12, 22, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (203, 1, 23, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (204, 2, 23, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (205, 3, 23, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (206, 4, 23, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (207, 6, 23, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (208, 8, 23, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (209, 10, 23, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (210, 11, 23, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (211, 1, 24, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (212, 2, 24, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (213, 3, 24, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (214, 5, 24, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (215, 7, 24, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (216, 9, 24, 1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (217, 10, 24, -1, '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (218, 1, 25, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (329, 16, 32, 1, '2025-12-09 17:18:43.839+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (335, 14, 30, 1, '2025-12-09 17:34:42.311+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (338, 14, 32, 1, '2025-12-09 18:41:00.623+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (339, 21, 35, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (340, 21, 36, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (341, 21, 37, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (342, 21, 38, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (343, 21, 39, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (344, 21, 40, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (240, 16, 30, 1, '2025-12-07 14:58:13.516+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (345, 21, 41, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (346, 21, 42, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (347, 21, 43, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (348, 21, 44, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (349, 21, 45, 1, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (350, 16, 46, 1, '2025-12-18 12:40:00+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (242, 16, 1, 1, '2025-12-08 11:52:48.518+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_votes VALUES (313, 14, 1, 1, NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 5610 (class 0 OID 30571)
-- Dependencies: 220
-- Data for Name: restaurants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.restaurants VALUES (30, 16, 'test', 'test', NULL, 43.188321004226005, 11.025064787204768, '2025-12-07 14:27:51.313+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (32, 16, 'test', 'test', '25cebd150a3c54d0085563758a9166b6.jpg', 42.791461249129675, 12.195933372932181, '2025-12-08 17:36:12.74+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (25, 1, 'Alice Test', 'Descrizione ristorante Alice TEST', 'https://picsum.photos/200?random=1', 45.4641, 9.1919, '2025-12-17 10:05:42.879896+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (1, 1, 'Test Alice 1', 'Descrizione ristorante Alice 1', 'https://picsum.photos/200?random=1', 45.4641, 9.1919, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (2, 1, 'Test Alice 2', 'Descrizione ristorante Alice 2', 'https://picsum.photos/200?random=2', 45.465, 9.192, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (3, 2, 'Test Bob 1', 'Descrizione ristorante Bob 1', 'https://picsum.photos/200?random=3', 41.9028, 12.4964, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (4, 2, 'Test Bob 2', 'Descrizione ristorante Bob 2', 'https://picsum.photos/200?random=4', 41.903, 12.497, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (5, 3, 'Test Carol 1', 'Descrizione ristorante Carol 1', 'https://picsum.photos/200?random=5', 40.8518, 14.2681, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (6, 3, 'Test Carol 2', 'Descrizione ristorante Carol 2', 'https://picsum.photos/200?random=6', 40.852, 14.2685, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (7, 4, 'Test Dave 1', 'Descrizione ristorante Dave 1', 'https://picsum.photos/200?random=7', 44.4949, 11.3426, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (8, 4, 'Test Dave 2', 'Descrizione ristorante Dave 2', 'https://picsum.photos/200?random=8', 44.4955, 11.343, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (9, 5, 'Test Eve 1', 'Descrizione ristorante Eve 1', 'https://picsum.photos/200?random=9', 45.0703, 7.6869, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (10, 5, 'Test Eve 2', 'Descrizione ristorante Eve 2', 'https://picsum.photos/200?random=10', 45.071, 7.6875, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (11, 6, 'Test Frank 1', 'Descrizione ristorante Frank 1', 'https://picsum.photos/200?random=11', 38.1157, 13.3615, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (12, 6, 'Test Frank 2', 'Descrizione ristorante Frank 2', 'https://picsum.photos/200?random=12', 38.116, 13.362, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (13, 7, 'Test Grace 1', 'Descrizione ristorante Grace 1', 'https://picsum.photos/200?random=13', 45.4384, 12.3267, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (14, 7, 'Test Grace 2', 'Descrizione ristorante Grace 2', 'https://picsum.photos/200?random=14', 45.439, 12.327, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (15, 8, 'Test Heidi 1', 'Descrizione ristorante Heidi 1', 'https://picsum.photos/200?random=15', 41.8919, 12.5113, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (16, 8, 'Test Heidi 2', 'Descrizione ristorante Heidi 2', 'https://picsum.photos/200?random=16', 41.8925, 12.512, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (17, 9, 'Test Ivan 1', 'Descrizione ristorante Ivan 1', 'https://picsum.photos/200?random=17', 46.0569, 14.5058, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (18, 9, 'Test Ivan 2', 'Descrizione ristorante Ivan 2', 'https://picsum.photos/200?random=18', 46.0575, 14.5065, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (19, 10, 'Test Judy 1', 'Descrizione ristorante Judy 1', 'https://picsum.photos/200?random=19', 44.4064, 8.9339, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (20, 10, 'Test Judy 2', 'Descrizione ristorante Judy 2', 'https://picsum.photos/200?random=20', 44.407, 8.9345, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (21, 11, 'Test Mallory 1', 'Descrizione ristorante Mallory 1', 'https://picsum.photos/200?random=21', 40.6401, 14.2529, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (22, 11, 'Test Mallory 2', 'Descrizione ristorante Mallory 2', 'https://picsum.photos/200?random=22', 40.641, 14.2535, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (23, 12, 'Test Trent 1', 'Descrizione ristorante Trent 1', 'https://picsum.photos/200?random=23', 37.5027, 15.0873, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (24, 12, 'Test Trent 2', 'Descrizione ristorante Trent 2', 'https://picsum.photos/200?random=24', 37.5035, 15.088, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (35, 21, 'Test E2E Test', 'Ristorante creato automaticamente durante i test end-to-end per verificare il corretto funzionamento della creazione.', NULL, 41.902277040963696, 12.485940867456883, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (36, 21, 'Test E2E test', 'Ristorante creato automaticamente durante i test end-to-end per verificare il corretto funzionamento della creazione.', '3d7d74f90e1d96211543b139ba8aaa3c.png', 41.902277040963696, 12.485940867456883, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (37, 21, 'Test E2E 1765807315742', 'Ristorante creato automaticamente durante i test end-to-end.', 'eae697eb1ad491cee49e775ae704fe4d.jpg', 41.902277040963696, 12.48046875, '2025-12-17 10:06:22.7576+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (38, 21, 'E2E 1765964275352', 'Ristorante creato automaticamente durante i test end-to-end.', '13109209e268bba6169a3b29dea5c952.jpg', 41.902277040963696, 12.48046875, '2025-12-17 10:37:55.57+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (39, 21, 'E2E 1765965325676', 'Ristorante creato automaticamente durante i test end-to-end.', '629cbfa5f55a484250b891fade8be681.jpg', 41.902277040963696, 12.48046875, '2025-12-17 10:55:25.892+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (40, 21, 'E2E 1765965810324', 'Ristorante creato automaticamente durante i test end-to-end.', '755ecca96d41697e3dc9d12f9ce0ed51.jpg', 41.902277040963696, 12.48046875, '2025-12-17 11:03:30.496+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (41, 21, 'E2E 1765966939062', 'Ristorante creato automaticamente durante i test end-to-end.', '4cfdfd2ae94556bc408a067e6335972c.jpg', 41.902277040963696, 12.48046875, '2025-12-17 11:22:19.233+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (42, 21, 'E2E 1765972297249', 'Ristorante creato automaticamente durante i test end-to-end.', 'f64ac9c026ceee218ad431c09b4075ae.jpg', 41.902277040963696, 12.48046875, '2025-12-17 12:51:37.508+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (43, 21, 'E2E 1766150129464', 'Ristorante creato automaticamente durante i test end-to-end.', '77d0a8a3389b5678880d3a0590ae8788.jpg', 41.902277040963696, 12.48046875, '2025-12-19 14:15:30.237+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (44, 21, 'E2E 1766150207458', 'Ristorante creato automaticamente durante i test end-to-end.', '27631c15cb2ce13900daa4abcd33271f.jpg', 41.902277040963696, 12.48046875, '2025-12-19 14:16:47.698+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (45, 21, 'E2E 1766150497776', 'Ristorante creato automaticamente durante i test end-to-end.', '85d2bc3bd490caa1d1c2663a0f2156e1.jpg', 41.902277040963696, 12.48046875, '2025-12-19 14:21:37.954+01') ON CONFLICT DO NOTHING;
INSERT INTO public.restaurants VALUES (46, 16, 'Ristorante che eliminerò', 'Porco dio', NULL, 40.9049671, 14.2061791, '2025-12-22 11:12:33.27+01') ON CONFLICT DO NOTHING;


--
-- TOC entry 5616 (class 0 OID 30633)
-- Dependencies: 226
-- Data for Name: review_votes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.review_votes VALUES (1, 2, 1, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (2, 3, 2, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (3, 4, 3, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (4, 5, 4, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (5, 6, 5, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (6, 7, 6, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (7, 8, 7, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (8, 9, 8, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (9, 10, 9, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (10, 11, 10, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (11, 1, 11, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (12, 3, 12, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (13, 5, 13, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (14, 2, 14, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (15, 2, 15, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (16, 3, 16, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (17, 4, 17, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (18, 5, 18, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (19, 6, 19, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (20, 7, 20, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (21, 8, 21, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (22, 9, 22, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (23, 10, 23, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (24, 11, 24, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (25, 1, 25, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (26, 2, 26, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (27, 3, 27, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (28, 1, 1, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (29, 2, 2, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (30, 5, 3, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (31, 6, 4, '2025-09-21 13:12:01.456454+02', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (32, 7, 5, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (33, 8, 6, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (34, 9, 7, '2025-09-21 13:12:01.456454+02', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (35, 10, 8, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (36, 11, 9, '2025-09-21 13:12:01.456454+02', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (37, 1, 10, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (38, 2, 11, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (39, 4, 13, '2025-09-21 13:12:01.456454+02', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (40, 5, 14, '2025-09-21 13:12:01.456454+02', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (41, 1, 28, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (42, 1, 29, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (43, 1, 30, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (44, 1, 31, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (45, 1, 32, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (46, 1, 33, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (99, 16, 34, '2025-12-07 15:38:45.608+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (193, 16, 96, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (194, 14, 96, '2025-12-09 17:37:56.663+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (196, 14, 54, '2025-12-09 17:40:19.3+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (58, 16, 6, '2025-12-06 18:04:04.923+01', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (107, 16, 2, '2025-12-08 11:11:28.683+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (60, 16, 10, '2025-12-06 18:31:18.537+01', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (199, 16, 100, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (109, 16, 8, '2025-12-08 11:25:40.586+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (245, 21, 116, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (205, 14, 103, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (206, 16, 104, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (207, 16, 105, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (208, 16, 106, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (118, 16, 11, '2025-12-08 11:52:52.16+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (212, 16, 107, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (213, 16, 108, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (75, 16, 29, '2025-12-06 18:46:22.951+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (214, 14, 109, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (125, 16, 47, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (126, 16, 46, '2025-12-08 12:05:22.229+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (127, 16, 48, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (130, 16, 49, '2025-12-08 12:07:05.79+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (131, 16, 50, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (132, 16, 51, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (133, 16, 52, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (134, 16, 53, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (135, 16, 54, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (136, 16, 55, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (137, 16, 56, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (138, 16, 57, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (139, 16, 58, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (140, 16, 59, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (141, 16, 60, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (142, 16, 61, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (143, 16, 62, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (144, 16, 63, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (145, 16, 64, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (148, 16, 45, '2025-12-08 12:19:50.909+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (234, 21, 110, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (235, 21, 111, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (236, 21, 112, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (238, 21, 2, '2025-12-15 15:38:35.454+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (239, 21, 8, '2025-12-15 15:44:35.57+01', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (240, 21, 113, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (241, 16, 113, '2025-12-15 15:47:30.167+01', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (242, 21, 114, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (246, 21, 117, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (247, 21, 118, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (248, 21, 119, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (249, 21, 120, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (244, 21, 115, '2025-12-17 11:02:25.231+01', -1) ON CONFLICT DO NOTHING;
INSERT INTO public.review_votes VALUES (250, 16, 121, NULL, 1) ON CONFLICT DO NOTHING;


--
-- TOC entry 5612 (class 0 OID 30586)
-- Dependencies: 222
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.reviews VALUES (1, 2, 1, 'Recensione 1 di Bob per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (2, 3, 1, 'Recensione 2 di Carol per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (3, 4, 1, 'Recensione 3 di Dave per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (4, 5, 1, 'Recensione 4 di Eve per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (5, 6, 1, 'Recensione 5 di Frank per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (6, 7, 1, 'Recensione 6 di Grace per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (7, 8, 1, 'Recensione 7 di Heidi per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (8, 9, 1, 'Recensione 8 di Ivan per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (9, 10, 1, 'Recensione 9 di Judy per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (10, 11, 1, 'Recensione 10 di Mallory per Alice 1', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (11, 1, 1, 'Risposta Alice alla recensione 2', 2, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (12, 3, 1, 'Risposta Carol alla recensione 5', 5, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (13, 5, 1, 'Risposta Eve alla recensione 3', 3, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (14, 2, 1, 'Risposta Bob alla recensione 10', 10, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (15, 2, 2, 'Recensione 1 di Bob per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (16, 3, 2, 'Recensione 2 di Carol per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (17, 4, 2, 'Recensione 3 di Dave per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (18, 5, 2, 'Recensione 4 di Eve per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (19, 6, 2, 'Recensione 5 di Frank per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (20, 7, 2, 'Recensione 6 di Grace per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (21, 8, 2, 'Recensione 7 di Heidi per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (22, 9, 2, 'Recensione 8 di Ivan per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (23, 10, 2, 'Recensione 9 di Judy per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (24, 11, 2, 'Recensione 10 di Mallory per Alice 2', NULL, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (25, 1, 2, 'Risposta Alice alla recensione 1', 1, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (26, 2, 2, 'Risposta Bob alla recensione 6', 6, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (27, 3, 2, 'Risposta Carol alla recensione 8', 8, '2025-09-21 13:12:01.456454+02', '2025-09-21 13:12:01.456454+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (28, 1, 1, 'Sottorecensione 1', NULL, '2025-10-12 14:37:36.864+02', '2025-10-12 14:37:36.864+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (29, 1, 1, 'Sottorecensione 2', NULL, '2025-10-12 14:38:11.707+02', '2025-10-12 14:38:11.707+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (30, 1, 1, 'Sottorecensione 3', 28, '2025-10-12 14:38:46.814+02', '2025-10-12 14:38:46.814+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (31, 1, 1, 'Sottorecensione 4', 28, '2025-10-12 14:38:55.556+02', '2025-10-12 14:38:55.556+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (32, 1, 1, 'Sottorecensione 5', 30, '2025-10-12 14:43:49.391+02', '2025-10-12 14:43:49.391+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (33, 1, 1, 'Sottorecensione 6', 31, '2025-10-12 14:43:58.824+02', '2025-10-12 14:43:58.824+02') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (34, 16, 1, 'ciao', NULL, '2025-12-06 16:31:25.073+01', '2025-12-06 16:31:25.073+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (45, 16, 30, '1', NULL, '2025-12-08 12:00:19.003+01', '2025-12-08 12:00:19.003+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (46, 16, 30, '2', 45, '2025-12-08 12:00:44.046+01', '2025-12-08 12:00:44.046+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (47, 16, 30, '3', 46, '2025-12-08 12:00:54.201+01', '2025-12-08 12:00:54.201+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (48, 16, 30, '4', 47, '2025-12-08 12:06:53.071+01', '2025-12-08 12:06:53.071+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (49, 16, 30, '5', 48, '2025-12-08 12:07:00.166+01', '2025-12-08 12:07:00.166+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (50, 16, 30, '6', 49, '2025-12-08 12:07:09.014+01', '2025-12-08 12:07:09.014+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (51, 16, 30, '7', 50, '2025-12-08 12:07:12.536+01', '2025-12-08 12:07:12.536+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (52, 16, 30, '8', 51, '2025-12-08 12:07:14.497+01', '2025-12-08 12:07:14.497+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (53, 16, 30, '9', 52, '2025-12-08 12:07:17.516+01', '2025-12-08 12:07:17.516+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (54, 16, 30, '10', 53, '2025-12-08 12:07:22.073+01', '2025-12-08 12:07:22.073+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (55, 16, 30, '11', 54, '2025-12-08 12:07:24.37+01', '2025-12-08 12:07:24.37+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (56, 16, 30, '12', 55, '2025-12-08 12:07:29.038+01', '2025-12-08 12:07:29.038+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (57, 16, 30, '13', 56, '2025-12-08 12:07:32.492+01', '2025-12-08 12:07:32.492+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (58, 16, 30, '14', 57, '2025-12-08 12:07:35.102+01', '2025-12-08 12:07:35.102+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (59, 16, 30, '15', 58, '2025-12-08 12:07:38.112+01', '2025-12-08 12:07:38.112+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (60, 16, 30, '16', 59, '2025-12-08 12:07:41.622+01', '2025-12-08 12:07:41.622+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (61, 16, 30, '17', 60, '2025-12-08 12:07:44.477+01', '2025-12-08 12:07:44.477+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (62, 16, 30, '18', 61, '2025-12-08 12:07:48.347+01', '2025-12-08 12:07:48.347+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (63, 16, 30, '19', 62, '2025-12-08 12:07:50.908+01', '2025-12-08 12:07:50.908+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (64, 16, 30, '20', 63, '2025-12-08 12:07:55.856+01', '2025-12-08 12:07:55.856+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (112, 21, 37, 'Recensione E2E 1765808574937', NULL, '2025-12-15 15:22:54.977+01', '2025-12-15 15:22:54.977+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (96, 16, 30, 'ciao testami', NULL, '2025-12-09 17:37:46.87+01', '2025-12-09 17:37:46.87+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (100, 16, 32, 'ciao', NULL, '2025-12-09 18:24:20.56+01', '2025-12-09 18:24:20.56+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (103, 14, 32, 'ehi', NULL, '2025-12-09 18:48:10.885+01', '2025-12-09 18:48:10.885+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (104, 16, 32, '1', NULL, '2025-12-09 18:51:52.704+01', '2025-12-09 18:51:52.704+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (105, 16, 32, '2', 104, '2025-12-09 18:51:59.113+01', '2025-12-09 18:51:59.113+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (106, 16, 32, '3', 105, '2025-12-09 18:52:01.404+01', '2025-12-09 18:52:01.404+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (107, 16, 32, '2a', 104, '2025-12-09 18:55:00.668+01', '2025-12-09 18:55:00.668+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (108, 16, 32, '2b', 104, '2025-12-09 18:55:03.211+01', '2025-12-09 18:55:03.211+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (109, 14, 32, 'test', 104, '2025-12-09 18:55:38.264+01', '2025-12-09 18:55:38.264+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (110, 21, 37, 'Recensione E2E - 15/12/2025 - 15:17', NULL, '2025-12-15 15:18:07.695+01', '2025-12-15 15:18:07.695+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (111, 21, 37, 'Recensione E2E 1765808508689', NULL, '2025-12-15 15:21:48.73+01', '2025-12-15 15:21:48.73+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (113, 21, 32, 'E2E Test notifica', NULL, '2025-12-15 15:47:20.357+01', '2025-12-15 15:47:20.357+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (114, 21, 38, 'Recensione E2E 1765965516066', NULL, '2025-12-17 10:58:36.12+01', '2025-12-17 10:58:36.12+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (115, 21, 25, 'Recensione per voto 1765965744979', NULL, '2025-12-17 11:02:25.028+01', '2025-12-17 11:02:25.028+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (116, 21, 38, 'Recensione E2E 1765965814313', NULL, '2025-12-17 11:03:34.361+01', '2025-12-17 11:03:34.361+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (117, 21, 38, 'Recensione E2E 1765967033201', NULL, '2025-12-17 11:23:53.243+01', '2025-12-17 11:23:53.243+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (118, 21, 38, 'Recensione E2E 1765972300578', NULL, '2025-12-17 12:51:40.617+01', '2025-12-17 12:51:40.617+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (119, 21, 38, 'Recensione E2E 1766150210731', NULL, '2025-12-19 14:16:50.771+01', '2025-12-19 14:16:50.771+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (120, 21, 38, 'Recensione E2E 1766150500958', NULL, '2025-12-19 14:21:41.01+01', '2025-12-19 14:21:41.01+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (121, 16, 46, 'porca madonna', NULL, '2025-12-18 12:40:00+01', '2025-12-22 11:13:02.407+01') ON CONFLICT DO NOTHING;
INSERT INTO public.reviews VALUES (122, 16, 46, 'porco gesu bambino', NULL, '2025-12-18 12:40:00+01', '2025-12-22 11:13:08.718+01') ON CONFLICT DO NOTHING;


--
-- TOC entry 5608 (class 0 OID 30559)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (1, 'alice', 'alice@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (2, 'bob', 'bob@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (3, 'carol', 'carol@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 3) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (4, 'dave', 'dave@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 4) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (5, 'eve', 'eve@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 5) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (6, 'frank', 'frank@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 6) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (7, 'grace', 'grace@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 7) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (8, 'heidi', 'heidi@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 8) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (9, 'ivan', 'ivan@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 9) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (10, 'judy', 'judy@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 10) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (11, 'mallory', 'mallory@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 11) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (12, 'trent', 'trent@example.com', '$2a$10$.2tNwkmSb.ruLUeTCw3rX.zyfijtl37PoVcTosmmzh92zV9N7N4Nu', 12) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (48, 'e2e_user_1765968084098', 'e2e_1765968084098@test.it', '$2b$12$MhdfXP/qOrA2P2FkzByfsu49Uy4IlIIFh9lnn23oc0Dh5wEtpIYyS', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (13, 'alessia', 'alessia@ciao.it', '$2b$12$XnULuVewRVZJzIfM/0wNGe6cGmGqONT3EWix/5XPmTJGMQyLd77mi', 14) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (16, 'alessia2', 'alessiaverrazzo@gmail.com', '$2b$12$i0aXH1LbS7mjW1X21OHkAuMrz1iBKn4eKx5o4H/Ohgy7CEI6RoMha', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (14, 'alessia1', 'alessia1@ciao.it', '$2b$12$pTMVqm1OZNkF94zo.F4WO.GUmekR00IfVLF2DnNVHzD42n6Dhy0da', 7) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (18, 'e2e_user1', 'e2euser1@test.it', '$2b$12$/n4zphETGu5vpPxXSifYquGdb4zAOkvh5LswnAZx0ugI7iohx32mO', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (19, 'e2e_user_1765803946699', 'e2e_1765803946699@test.it', '$2b$12$ztoTQGTKR6W6P3xmIXQQwezSxlVBWSsJXKbrZDyziI5PWQ9j8hpmm', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (20, 'e2e_user_1765804005520', 'e2e_1765804005520@test.it', '$2b$12$qsIXOgVqpYz6is./7VgaROW/R4zAxXCJKs1TQnlQfR0z1toNo1fFG', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (21, 'e2e_user', 'e2e_user@test.it', '$2b$12$hsWcZuprFkY5Ni7Qpkjym.ikoI2spglXiYTznEyNLkU7xR1TmQXGe', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (23, 'e2e_delete_1765811475254', 'e2e_delete_1765811475254@test.it', '$2b$12$WCQF8eMGEd5Y7lZ3jdVaS.razHhm4NrPGS233HLYLnUM4onMeEL62', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (25, 'e2e_delete_1765812682046', 'e2e_delete_1765812682046@test.it', '$2b$12$/j/pdzkSnEcrz3EuW2Rr6u8p2cQ0RtyqAmXtS/bquBem/wt.FyaXi', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (26, 'e2e_delete_1765812752911', 'e2e_delete_1765812752911@test.it', '$2b$12$J5om2atBPG2By5KI7Yinhu7i7xzHOuL5M4G//iVo1LRBz4qCbsu0K', 1) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (30, 'e2e_user_1765964108882', 'e2e_1765964108882@test.it', '$2b$12$wZsWFLobiGcWzBx5/kyNSOI9E.WobudQ1yzl/e.9ChFwjh.3wZUbe', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (32, 'e2e_user_1765964378744', 'e2e_1765964378744@test.it', '$2b$12$zL8VnhaPVPCT0GSnKOBv6urcYlG0B2aSjt3pd77JWFl88rV7/VxTu', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (34, 'e2e_user_1765965799537', 'e2e_1765965799537@test.it', '$2b$12$UxWJr8/wIvVGoyaACszg3.6ISeDuMVLnJIg3./d0h.iJnEy8uGycW', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (36, 'e2e_user_1765966105957', 'e2e_1765966105957@test.it', '$2b$12$3NywxEFCs0BL7zFTo31lAegQar2Hwaqqya9WI9qXqiQAjQFWj4QIy', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (38, 'e2e_user_1765966270254', 'e2e_1765966270254@test.it', '$2b$12$QIfMbdzqFj/WPFwxRkcnCu9Awq1ZV6zpfuyGVUPS88hZ5.KaTIem2', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (40, 'e2e_user_1765967399692', 'e2e_1765967399692@test.it', '$2b$12$uwKMcl.kz2Gpj6Q6.mnewe/U52RNfJKUB.UflrAfzpDmHLQdvL9wu', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (42, 'e2e_user_1765967617970', 'e2e_1765967617970@test.it', '$2b$12$MWcyWTTHPi/df.Ie7m/s8.6YufIbAxRkqjWNtF7DyDEqr7FdZfSx6', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (44, 'e2e_user_1765967735995', 'e2e_1765967735995@test.it', '$2b$12$Ed.nFIPuEUqrWJvMrASDQeoiLASwTIB64xY7ZscG4ttTQXRM.k3Uu', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (46, 'e2e_user_1765967905940', 'e2e_1765967905940@test.it', '$2b$12$3ld9wLKQ.2QEzlXGSG5oyOhvI6TqDJMFlxO/Ks0ca/VruEaGgouP.', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (50, 'e2e_user_1765968204886', 'e2e_1765968204886@test.it', '$2b$12$.jU6HET0uymALRpM0bf95uO1BYE5A4d7P7fZPoUP0CxjBUGZ6f1hW', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (52, 'e2e_user_1765968330718', 'e2e_1765968330718@test.it', '$2b$12$WyKMXl5S1d0G1VsbL2u1zupJUtlv2ebk4hLwy7YPUT.bCOIKcVX.O', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (54, 'e2e_user_1765968476208', 'e2e_1765968476208@test.it', '$2b$12$UP.lx0Qw5lGeTOvEUdijq.AwWrTEpS6iEAyLOfvYtfN5toyBp3qX2', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (56, 'e2e_user_1765969036719', 'e2e_1765969036719@test.it', '$2b$12$ubJTbOA4fsyLNjI9hvg5/.VHS/8WxeCS/iVjivgslcrhphrQcY62q', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (58, 'e2e_user_1765969501299', 'e2e_1765969501299@test.it', '$2b$12$b2hpmTNjDd57uoIhsr0XkeuWKP5POUdXgGecXJUD8yfxAafUsXbv2', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (60, 'e2e_user_1765969592356', 'e2e_1765969592356@test.it', '$2b$12$aSnZckD7YwAuJMAjC8MwgOIhkaKBnNiK9yoTFWPWC8V4tFIIVT95C', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (62, 'e2e_user_1765969683703', 'e2e_1765969683703@test.it', '$2b$12$hWltx6Z2tIACl2oRNKe6puDDi/aCvUqZM7Cw4vriFr.b.d3GVzJBm', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (64, 'e2e_user_1765969900974', 'e2e_1765969900974@test.it', '$2b$12$P46hM3DxJKyWK5Vb.fbo1uBQxX0V6wJEEvYHjzIhwXWKtYiO1jv/2', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (66, 'e2e_user_1765970070092', 'e2e_1765970070092@test.it', '$2b$12$XZjz02897Xp6eC2hyQSFueRNAttovIw3rsAeBGDU4PYjRMTWRkc8K', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (68, 'e2e_user_1765970186943', 'e2e_1765970186943@test.it', '$2b$12$kPqFF2RzLOx57NldJfRQRuXvV77Cp8s9oqoxOjPG0l1y9Q.P2I6hK', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (70, 'e2e_user_1765970702779', 'e2e_1765970702779@test.it', '$2b$12$UE7ikVXhZMCdOPuMnxIY/.hNl49p06ZiR/KM2Rc9mAkaeEvdjfRyO', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (72, 'e2e_user_1765970863339', 'e2e_1765970863339@test.it', '$2b$12$ITz58LJsz1NpOmYxLR6i3ODKXGqSvMMGWnXL2krkxyMv6HU0JbTCi', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (74, 'e2e_user_1765971153884', 'e2e_1765971153884@test.it', '$2b$12$wRItV18ck34gDKE.g5xVvucR4I3hIoqe5cdx0aqotudODQk8Of5HS', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (76, 'e2e_user_1765971556362', 'e2e_1765971556362@test.it', '$2b$12$hjejvPIO85WB/63TNQT2b.XZ9TlMU1pvrkSHmpUIAgF3kSAPGQpSC', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (78, 'e2e_user_1765971750898', 'e2e_1765971750898@test.it', '$2b$12$BfIlfNmYkz29E2WYzV0EjOH2E0SlG9GG.uboGtyJ9M1vPU5hcfumq', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (80, 'e2e_user_1765971842248', 'e2e_1765971842248@test.it', '$2b$12$EJohPFckttCediSE78R.XuGWzvq5xrSUcO8Nywgspw39A3QD0AVWq', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (82, 'e2e_user_1765971906551', 'e2e_1765971906551@test.it', '$2b$12$T2yfOgDVy47sK3a34Ab8oOivFCZvlzs5fP/RFJLnqG97/a75j/3ua', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (84, 'e2e_user_1765972005409', 'e2e_1765972005409@test.it', '$2b$12$zB2Ds0ihUSFIwAZJJM3U6OYkIW7unlApSDHUhPKLLNUxjOVO0P0k6', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (86, 'e2e_user_1765972174250', 'e2e_1765972174250@test.it', '$2b$12$S0l9CoaLNopAFhIc5VfAYeRSXpcDEXM6rOymVQ9h6KrBIMLgXmpfG', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (88, 'e2e_user_1765972293839', 'e2e_1765972293839@test.it', '$2b$12$JDK0fLDF3Ly12e5Uo3F0m.ZO09ill4oCzLdzAzzFebRjrsON8WmsG', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (90, 'e2e_user_1766150124334', 'e2e_1766150124334@test.it', '$2b$12$M1rH.xo6IeXMJyRGKH1iceGLoVttGo4QaGA3pEtdocc0AqjRTfz/e', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (91, 'e2e_user_1766150204143', 'e2e_1766150204143@test.it', '$2b$12$jY8kNtXQ7dRwVs5yuS4XMez76wPex6tkyPj5uZkLfAX1Hm7yhG5om', 2) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (93, 'e2e_user_1766150494369', 'e2e_1766150494369@test.it', '$2b$12$lhw8Q5cZt.fgyYBTED7p7.5ONhiCT93rCitjJ2SZZinuhJK6y75zq', 2) ON CONFLICT DO NOTHING;


--
-- TOC entry 5635 (class 0 OID 0)
-- Dependencies: 227
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 77, true);


--
-- TOC entry 5636 (class 0 OID 0)
-- Dependencies: 229
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 20, true);


--
-- TOC entry 5637 (class 0 OID 0)
-- Dependencies: 223
-- Name: restaurant_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.restaurant_votes_id_seq', 350, true);


--
-- TOC entry 5638 (class 0 OID 0)
-- Dependencies: 219
-- Name: restaurants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.restaurants_id_seq', 46, true);


--
-- TOC entry 5639 (class 0 OID 0)
-- Dependencies: 225
-- Name: review_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.review_votes_id_seq', 251, true);


--
-- TOC entry 5640 (class 0 OID 0)
-- Dependencies: 221
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_id_seq', 122, true);


--
-- TOC entry 5641 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 93, true);


--
-- TOC entry 5227 (class 2606 OID 30661)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5229 (class 2606 OID 30679)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5231 (class 2606 OID 70000)
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- TOC entry 5233 (class 2606 OID 70004)
-- Name: password_reset_tokens password_reset_tokens_token_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key1 UNIQUE (token);


--
-- TOC entry 5235 (class 2606 OID 69922)
-- Name: password_reset_tokens password_reset_tokens_token_key10; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key10 UNIQUE (token);


--
-- TOC entry 5237 (class 2606 OID 69970)
-- Name: password_reset_tokens password_reset_tokens_token_key100; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key100 UNIQUE (token);


--
-- TOC entry 5239 (class 2606 OID 69926)
-- Name: password_reset_tokens password_reset_tokens_token_key101; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key101 UNIQUE (token);


--
-- TOC entry 5241 (class 2606 OID 69928)
-- Name: password_reset_tokens password_reset_tokens_token_key102; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key102 UNIQUE (token);


--
-- TOC entry 5243 (class 2606 OID 69924)
-- Name: password_reset_tokens password_reset_tokens_token_key11; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key11 UNIQUE (token);


--
-- TOC entry 5245 (class 2606 OID 69986)
-- Name: password_reset_tokens password_reset_tokens_token_key12; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key12 UNIQUE (token);


--
-- TOC entry 5247 (class 2606 OID 69992)
-- Name: password_reset_tokens password_reset_tokens_token_key13; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key13 UNIQUE (token);


--
-- TOC entry 5249 (class 2606 OID 69988)
-- Name: password_reset_tokens password_reset_tokens_token_key14; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key14 UNIQUE (token);


--
-- TOC entry 5251 (class 2606 OID 69990)
-- Name: password_reset_tokens password_reset_tokens_token_key15; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key15 UNIQUE (token);


--
-- TOC entry 5253 (class 2606 OID 69920)
-- Name: password_reset_tokens password_reset_tokens_token_key16; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key16 UNIQUE (token);


--
-- TOC entry 5255 (class 2606 OID 70068)
-- Name: password_reset_tokens password_reset_tokens_token_key17; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key17 UNIQUE (token);


--
-- TOC entry 5257 (class 2606 OID 70070)
-- Name: password_reset_tokens password_reset_tokens_token_key18; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key18 UNIQUE (token);


--
-- TOC entry 5259 (class 2606 OID 69916)
-- Name: password_reset_tokens password_reset_tokens_token_key19; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key19 UNIQUE (token);


--
-- TOC entry 5261 (class 2606 OID 70006)
-- Name: password_reset_tokens password_reset_tokens_token_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key2 UNIQUE (token);


--
-- TOC entry 5263 (class 2606 OID 70072)
-- Name: password_reset_tokens password_reset_tokens_token_key20; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key20 UNIQUE (token);


--
-- TOC entry 5265 (class 2606 OID 70098)
-- Name: password_reset_tokens password_reset_tokens_token_key21; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key21 UNIQUE (token);


--
-- TOC entry 5267 (class 2606 OID 70094)
-- Name: password_reset_tokens password_reset_tokens_token_key22; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key22 UNIQUE (token);


--
-- TOC entry 5269 (class 2606 OID 70074)
-- Name: password_reset_tokens password_reset_tokens_token_key23; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key23 UNIQUE (token);


--
-- TOC entry 5271 (class 2606 OID 69946)
-- Name: password_reset_tokens password_reset_tokens_token_key24; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key24 UNIQUE (token);


--
-- TOC entry 5273 (class 2606 OID 70090)
-- Name: password_reset_tokens password_reset_tokens_token_key25; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key25 UNIQUE (token);


--
-- TOC entry 5275 (class 2606 OID 70020)
-- Name: password_reset_tokens password_reset_tokens_token_key26; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key26 UNIQUE (token);


--
-- TOC entry 5277 (class 2606 OID 70088)
-- Name: password_reset_tokens password_reset_tokens_token_key27; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key27 UNIQUE (token);


--
-- TOC entry 5279 (class 2606 OID 70086)
-- Name: password_reset_tokens password_reset_tokens_token_key28; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key28 UNIQUE (token);


--
-- TOC entry 5281 (class 2606 OID 70022)
-- Name: password_reset_tokens password_reset_tokens_token_key29; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key29 UNIQUE (token);


--
-- TOC entry 5283 (class 2606 OID 70008)
-- Name: password_reset_tokens password_reset_tokens_token_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key3 UNIQUE (token);


--
-- TOC entry 5285 (class 2606 OID 70024)
-- Name: password_reset_tokens password_reset_tokens_token_key30; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key30 UNIQUE (token);


--
-- TOC entry 5287 (class 2606 OID 70084)
-- Name: password_reset_tokens password_reset_tokens_token_key31; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key31 UNIQUE (token);


--
-- TOC entry 5289 (class 2606 OID 70026)
-- Name: password_reset_tokens password_reset_tokens_token_key32; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key32 UNIQUE (token);


--
-- TOC entry 5291 (class 2606 OID 70078)
-- Name: password_reset_tokens password_reset_tokens_token_key33; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key33 UNIQUE (token);


--
-- TOC entry 5293 (class 2606 OID 70028)
-- Name: password_reset_tokens password_reset_tokens_token_key34; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key34 UNIQUE (token);


--
-- TOC entry 5295 (class 2606 OID 70076)
-- Name: password_reset_tokens password_reset_tokens_token_key35; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key35 UNIQUE (token);


--
-- TOC entry 5297 (class 2606 OID 70036)
-- Name: password_reset_tokens password_reset_tokens_token_key36; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key36 UNIQUE (token);


--
-- TOC entry 5299 (class 2606 OID 69984)
-- Name: password_reset_tokens password_reset_tokens_token_key37; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key37 UNIQUE (token);


--
-- TOC entry 5301 (class 2606 OID 70038)
-- Name: password_reset_tokens password_reset_tokens_token_key38; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key38 UNIQUE (token);


--
-- TOC entry 5303 (class 2606 OID 69982)
-- Name: password_reset_tokens password_reset_tokens_token_key39; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key39 UNIQUE (token);


--
-- TOC entry 5305 (class 2606 OID 70012)
-- Name: password_reset_tokens password_reset_tokens_token_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key4 UNIQUE (token);


--
-- TOC entry 5307 (class 2606 OID 69980)
-- Name: password_reset_tokens password_reset_tokens_token_key40; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key40 UNIQUE (token);


--
-- TOC entry 5309 (class 2606 OID 70002)
-- Name: password_reset_tokens password_reset_tokens_token_key41; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key41 UNIQUE (token);


--
-- TOC entry 5311 (class 2606 OID 70040)
-- Name: password_reset_tokens password_reset_tokens_token_key42; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key42 UNIQUE (token);


--
-- TOC entry 5313 (class 2606 OID 69978)
-- Name: password_reset_tokens password_reset_tokens_token_key43; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key43 UNIQUE (token);


--
-- TOC entry 5315 (class 2606 OID 70042)
-- Name: password_reset_tokens password_reset_tokens_token_key44; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key44 UNIQUE (token);


--
-- TOC entry 5317 (class 2606 OID 70044)
-- Name: password_reset_tokens password_reset_tokens_token_key45; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key45 UNIQUE (token);


--
-- TOC entry 5319 (class 2606 OID 69976)
-- Name: password_reset_tokens password_reset_tokens_token_key46; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key46 UNIQUE (token);


--
-- TOC entry 5321 (class 2606 OID 70046)
-- Name: password_reset_tokens password_reset_tokens_token_key47; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key47 UNIQUE (token);


--
-- TOC entry 5323 (class 2606 OID 69974)
-- Name: password_reset_tokens password_reset_tokens_token_key48; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key48 UNIQUE (token);


--
-- TOC entry 5325 (class 2606 OID 70048)
-- Name: password_reset_tokens password_reset_tokens_token_key49; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key49 UNIQUE (token);


--
-- TOC entry 5327 (class 2606 OID 70014)
-- Name: password_reset_tokens password_reset_tokens_token_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key5 UNIQUE (token);


--
-- TOC entry 5329 (class 2606 OID 69972)
-- Name: password_reset_tokens password_reset_tokens_token_key50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key50 UNIQUE (token);


--
-- TOC entry 5331 (class 2606 OID 70050)
-- Name: password_reset_tokens password_reset_tokens_token_key51; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key51 UNIQUE (token);


--
-- TOC entry 5333 (class 2606 OID 69968)
-- Name: password_reset_tokens password_reset_tokens_token_key52; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key52 UNIQUE (token);


--
-- TOC entry 5335 (class 2606 OID 69914)
-- Name: password_reset_tokens password_reset_tokens_token_key53; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key53 UNIQUE (token);


--
-- TOC entry 5337 (class 2606 OID 70102)
-- Name: password_reset_tokens password_reset_tokens_token_key54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key54 UNIQUE (token);


--
-- TOC entry 5339 (class 2606 OID 69912)
-- Name: password_reset_tokens password_reset_tokens_token_key55; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key55 UNIQUE (token);


--
-- TOC entry 5341 (class 2606 OID 70104)
-- Name: password_reset_tokens password_reset_tokens_token_key56; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key56 UNIQUE (token);


--
-- TOC entry 5343 (class 2606 OID 69908)
-- Name: password_reset_tokens password_reset_tokens_token_key57; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key57 UNIQUE (token);


--
-- TOC entry 5345 (class 2606 OID 70108)
-- Name: password_reset_tokens password_reset_tokens_token_key58; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key58 UNIQUE (token);


--
-- TOC entry 5347 (class 2606 OID 70112)
-- Name: password_reset_tokens password_reset_tokens_token_key59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key59 UNIQUE (token);


--
-- TOC entry 5349 (class 2606 OID 69998)
-- Name: password_reset_tokens password_reset_tokens_token_key6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key6 UNIQUE (token);


--
-- TOC entry 5351 (class 2606 OID 70110)
-- Name: password_reset_tokens password_reset_tokens_token_key60; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key60 UNIQUE (token);


--
-- TOC entry 5353 (class 2606 OID 70100)
-- Name: password_reset_tokens password_reset_tokens_token_key61; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key61 UNIQUE (token);


--
-- TOC entry 5355 (class 2606 OID 70030)
-- Name: password_reset_tokens password_reset_tokens_token_key62; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key62 UNIQUE (token);


--
-- TOC entry 5357 (class 2606 OID 70034)
-- Name: password_reset_tokens password_reset_tokens_token_key63; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key63 UNIQUE (token);


--
-- TOC entry 5359 (class 2606 OID 70032)
-- Name: password_reset_tokens password_reset_tokens_token_key64; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key64 UNIQUE (token);


--
-- TOC entry 5361 (class 2606 OID 69944)
-- Name: password_reset_tokens password_reset_tokens_token_key65; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key65 UNIQUE (token);


--
-- TOC entry 5363 (class 2606 OID 69932)
-- Name: password_reset_tokens password_reset_tokens_token_key66; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key66 UNIQUE (token);


--
-- TOC entry 5365 (class 2606 OID 70082)
-- Name: password_reset_tokens password_reset_tokens_token_key67; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key67 UNIQUE (token);


--
-- TOC entry 5367 (class 2606 OID 69966)
-- Name: password_reset_tokens password_reset_tokens_token_key68; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key68 UNIQUE (token);


--
-- TOC entry 5369 (class 2606 OID 70010)
-- Name: password_reset_tokens password_reset_tokens_token_key69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key69 UNIQUE (token);


--
-- TOC entry 5371 (class 2606 OID 70016)
-- Name: password_reset_tokens password_reset_tokens_token_key7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key7 UNIQUE (token);


--
-- TOC entry 5373 (class 2606 OID 70052)
-- Name: password_reset_tokens password_reset_tokens_token_key70; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key70 UNIQUE (token);


--
-- TOC entry 5375 (class 2606 OID 69964)
-- Name: password_reset_tokens password_reset_tokens_token_key71; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key71 UNIQUE (token);


--
-- TOC entry 5377 (class 2606 OID 70054)
-- Name: password_reset_tokens password_reset_tokens_token_key72; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key72 UNIQUE (token);


--
-- TOC entry 5379 (class 2606 OID 69962)
-- Name: password_reset_tokens password_reset_tokens_token_key73; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key73 UNIQUE (token);


--
-- TOC entry 5381 (class 2606 OID 70056)
-- Name: password_reset_tokens password_reset_tokens_token_key74; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key74 UNIQUE (token);


--
-- TOC entry 5383 (class 2606 OID 69960)
-- Name: password_reset_tokens password_reset_tokens_token_key75; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key75 UNIQUE (token);


--
-- TOC entry 5385 (class 2606 OID 70058)
-- Name: password_reset_tokens password_reset_tokens_token_key76; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key76 UNIQUE (token);


--
-- TOC entry 5387 (class 2606 OID 69958)
-- Name: password_reset_tokens password_reset_tokens_token_key77; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key77 UNIQUE (token);


--
-- TOC entry 5389 (class 2606 OID 70060)
-- Name: password_reset_tokens password_reset_tokens_token_key78; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key78 UNIQUE (token);


--
-- TOC entry 5391 (class 2606 OID 69956)
-- Name: password_reset_tokens password_reset_tokens_token_key79; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key79 UNIQUE (token);


--
-- TOC entry 5393 (class 2606 OID 69996)
-- Name: password_reset_tokens password_reset_tokens_token_key8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key8 UNIQUE (token);


--
-- TOC entry 5395 (class 2606 OID 70062)
-- Name: password_reset_tokens password_reset_tokens_token_key80; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key80 UNIQUE (token);


--
-- TOC entry 5397 (class 2606 OID 69954)
-- Name: password_reset_tokens password_reset_tokens_token_key81; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key81 UNIQUE (token);


--
-- TOC entry 5399 (class 2606 OID 70064)
-- Name: password_reset_tokens password_reset_tokens_token_key82; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key82 UNIQUE (token);


--
-- TOC entry 5401 (class 2606 OID 69952)
-- Name: password_reset_tokens password_reset_tokens_token_key83; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key83 UNIQUE (token);


--
-- TOC entry 5403 (class 2606 OID 70066)
-- Name: password_reset_tokens password_reset_tokens_token_key84; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key84 UNIQUE (token);


--
-- TOC entry 5405 (class 2606 OID 69942)
-- Name: password_reset_tokens password_reset_tokens_token_key85; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key85 UNIQUE (token);


--
-- TOC entry 5407 (class 2606 OID 69934)
-- Name: password_reset_tokens password_reset_tokens_token_key86; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key86 UNIQUE (token);


--
-- TOC entry 5409 (class 2606 OID 69940)
-- Name: password_reset_tokens password_reset_tokens_token_key87; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key87 UNIQUE (token);


--
-- TOC entry 5411 (class 2606 OID 70096)
-- Name: password_reset_tokens password_reset_tokens_token_key88; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key88 UNIQUE (token);


--
-- TOC entry 5413 (class 2606 OID 69938)
-- Name: password_reset_tokens password_reset_tokens_token_key89; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key89 UNIQUE (token);


--
-- TOC entry 5415 (class 2606 OID 69994)
-- Name: password_reset_tokens password_reset_tokens_token_key9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key9 UNIQUE (token);


--
-- TOC entry 5417 (class 2606 OID 70080)
-- Name: password_reset_tokens password_reset_tokens_token_key90; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key90 UNIQUE (token);


--
-- TOC entry 5419 (class 2606 OID 69936)
-- Name: password_reset_tokens password_reset_tokens_token_key91; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key91 UNIQUE (token);


--
-- TOC entry 5421 (class 2606 OID 70092)
-- Name: password_reset_tokens password_reset_tokens_token_key92; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key92 UNIQUE (token);


--
-- TOC entry 5423 (class 2606 OID 70018)
-- Name: password_reset_tokens password_reset_tokens_token_key93; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key93 UNIQUE (token);


--
-- TOC entry 5425 (class 2606 OID 69910)
-- Name: password_reset_tokens password_reset_tokens_token_key94; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key94 UNIQUE (token);


--
-- TOC entry 5427 (class 2606 OID 69950)
-- Name: password_reset_tokens password_reset_tokens_token_key95; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key95 UNIQUE (token);


--
-- TOC entry 5429 (class 2606 OID 70106)
-- Name: password_reset_tokens password_reset_tokens_token_key96; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key96 UNIQUE (token);


--
-- TOC entry 5431 (class 2606 OID 69948)
-- Name: password_reset_tokens password_reset_tokens_token_key97; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key97 UNIQUE (token);


--
-- TOC entry 5433 (class 2606 OID 69918)
-- Name: password_reset_tokens password_reset_tokens_token_key98; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key98 UNIQUE (token);


--
-- TOC entry 5435 (class 2606 OID 69930)
-- Name: password_reset_tokens password_reset_tokens_token_key99; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key99 UNIQUE (token);


--
-- TOC entry 5217 (class 2606 OID 30619)
-- Name: restaurant_votes restaurant_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_votes
    ADD CONSTRAINT restaurant_votes_pkey PRIMARY KEY (id);


--
-- TOC entry 5213 (class 2606 OID 30579)
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- TOC entry 5222 (class 2606 OID 30640)
-- Name: review_votes review_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_pkey PRIMARY KEY (id);


--
-- TOC entry 5215 (class 2606 OID 30595)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 5220 (class 2606 OID 30621)
-- Name: restaurant_votes uniq_user_restaurant_vote; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_votes
    ADD CONSTRAINT uniq_user_restaurant_vote UNIQUE (user_id, restaurant_id);


--
-- TOC entry 5225 (class 2606 OID 30642)
-- Name: review_votes uniq_user_review_vote; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT uniq_user_review_vote UNIQUE (user_id, review_id);


--
-- TOC entry 4799 (class 2606 OID 69784)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4801 (class 2606 OID 69786)
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- TOC entry 4803 (class 2606 OID 69776)
-- Name: users users_email_key10; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key10 UNIQUE (email);


--
-- TOC entry 4805 (class 2606 OID 69898)
-- Name: users users_email_key100; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key100 UNIQUE (email);


--
-- TOC entry 4807 (class 2606 OID 69694)
-- Name: users users_email_key101; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key101 UNIQUE (email);


--
-- TOC entry 4809 (class 2606 OID 69748)
-- Name: users users_email_key102; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key102 UNIQUE (email);


--
-- TOC entry 4811 (class 2606 OID 69822)
-- Name: users users_email_key11; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key11 UNIQUE (email);


--
-- TOC entry 4813 (class 2606 OID 69824)
-- Name: users users_email_key12; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key12 UNIQUE (email);


--
-- TOC entry 4815 (class 2606 OID 69774)
-- Name: users users_email_key13; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key13 UNIQUE (email);


--
-- TOC entry 4817 (class 2606 OID 69826)
-- Name: users users_email_key14; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key14 UNIQUE (email);


--
-- TOC entry 4819 (class 2606 OID 69772)
-- Name: users users_email_key15; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key15 UNIQUE (email);


--
-- TOC entry 4821 (class 2606 OID 69770)
-- Name: users users_email_key16; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key16 UNIQUE (email);


--
-- TOC entry 4823 (class 2606 OID 69828)
-- Name: users users_email_key17; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key17 UNIQUE (email);


--
-- TOC entry 4825 (class 2606 OID 69742)
-- Name: users users_email_key18; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key18 UNIQUE (email);


--
-- TOC entry 4827 (class 2606 OID 69768)
-- Name: users users_email_key19; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key19 UNIQUE (email);


--
-- TOC entry 4829 (class 2606 OID 69788)
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- TOC entry 4831 (class 2606 OID 69744)
-- Name: users users_email_key20; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key20 UNIQUE (email);


--
-- TOC entry 4833 (class 2606 OID 69766)
-- Name: users users_email_key21; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key21 UNIQUE (email);


--
-- TOC entry 4835 (class 2606 OID 69764)
-- Name: users users_email_key22; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key22 UNIQUE (email);


--
-- TOC entry 4837 (class 2606 OID 69746)
-- Name: users users_email_key23; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key23 UNIQUE (email);


--
-- TOC entry 4839 (class 2606 OID 69750)
-- Name: users users_email_key24; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key24 UNIQUE (email);


--
-- TOC entry 4841 (class 2606 OID 69762)
-- Name: users users_email_key25; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key25 UNIQUE (email);


--
-- TOC entry 4843 (class 2606 OID 69752)
-- Name: users users_email_key26; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key26 UNIQUE (email);


--
-- TOC entry 4845 (class 2606 OID 69760)
-- Name: users users_email_key27; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key27 UNIQUE (email);


--
-- TOC entry 4847 (class 2606 OID 69754)
-- Name: users users_email_key28; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key28 UNIQUE (email);


--
-- TOC entry 4849 (class 2606 OID 69758)
-- Name: users users_email_key29; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key29 UNIQUE (email);


--
-- TOC entry 4851 (class 2606 OID 69790)
-- Name: users users_email_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key3 UNIQUE (email);


--
-- TOC entry 4853 (class 2606 OID 69756)
-- Name: users users_email_key30; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key30 UNIQUE (email);


--
-- TOC entry 4855 (class 2606 OID 69740)
-- Name: users users_email_key31; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key31 UNIQUE (email);


--
-- TOC entry 4857 (class 2606 OID 69830)
-- Name: users users_email_key32; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key32 UNIQUE (email);


--
-- TOC entry 4859 (class 2606 OID 69738)
-- Name: users users_email_key33; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key33 UNIQUE (email);


--
-- TOC entry 4861 (class 2606 OID 69736)
-- Name: users users_email_key34; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key34 UNIQUE (email);


--
-- TOC entry 4863 (class 2606 OID 69734)
-- Name: users users_email_key35; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key35 UNIQUE (email);


--
-- TOC entry 4865 (class 2606 OID 69832)
-- Name: users users_email_key36; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key36 UNIQUE (email);


--
-- TOC entry 4867 (class 2606 OID 69732)
-- Name: users users_email_key37; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key37 UNIQUE (email);


--
-- TOC entry 4869 (class 2606 OID 69834)
-- Name: users users_email_key38; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key38 UNIQUE (email);


--
-- TOC entry 4871 (class 2606 OID 69862)
-- Name: users users_email_key39; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key39 UNIQUE (email);


--
-- TOC entry 4873 (class 2606 OID 69792)
-- Name: users users_email_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key4 UNIQUE (email);


--
-- TOC entry 4875 (class 2606 OID 69836)
-- Name: users users_email_key40; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key40 UNIQUE (email);


--
-- TOC entry 4877 (class 2606 OID 69860)
-- Name: users users_email_key41; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key41 UNIQUE (email);


--
-- TOC entry 4879 (class 2606 OID 69838)
-- Name: users users_email_key42; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key42 UNIQUE (email);


--
-- TOC entry 4881 (class 2606 OID 69858)
-- Name: users users_email_key43; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key43 UNIQUE (email);


--
-- TOC entry 4883 (class 2606 OID 69840)
-- Name: users users_email_key44; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key44 UNIQUE (email);


--
-- TOC entry 4885 (class 2606 OID 69842)
-- Name: users users_email_key45; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key45 UNIQUE (email);


--
-- TOC entry 4887 (class 2606 OID 69856)
-- Name: users users_email_key46; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key46 UNIQUE (email);


--
-- TOC entry 4889 (class 2606 OID 69844)
-- Name: users users_email_key47; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key47 UNIQUE (email);


--
-- TOC entry 4891 (class 2606 OID 69854)
-- Name: users users_email_key48; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key48 UNIQUE (email);


--
-- TOC entry 4893 (class 2606 OID 69846)
-- Name: users users_email_key49; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key49 UNIQUE (email);


--
-- TOC entry 4895 (class 2606 OID 69818)
-- Name: users users_email_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key5 UNIQUE (email);


--
-- TOC entry 4897 (class 2606 OID 69852)
-- Name: users users_email_key50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key50 UNIQUE (email);


--
-- TOC entry 4899 (class 2606 OID 69848)
-- Name: users users_email_key51; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key51 UNIQUE (email);


--
-- TOC entry 4901 (class 2606 OID 69850)
-- Name: users users_email_key52; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key52 UNIQUE (email);


--
-- TOC entry 4903 (class 2606 OID 69816)
-- Name: users users_email_key53; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key53 UNIQUE (email);


--
-- TOC entry 4905 (class 2606 OID 69794)
-- Name: users users_email_key54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key54 UNIQUE (email);


--
-- TOC entry 4907 (class 2606 OID 69814)
-- Name: users users_email_key55; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key55 UNIQUE (email);


--
-- TOC entry 4909 (class 2606 OID 69796)
-- Name: users users_email_key56; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key56 UNIQUE (email);


--
-- TOC entry 4911 (class 2606 OID 69812)
-- Name: users users_email_key57; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key57 UNIQUE (email);


--
-- TOC entry 4913 (class 2606 OID 69798)
-- Name: users users_email_key58; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key58 UNIQUE (email);


--
-- TOC entry 4915 (class 2606 OID 69810)
-- Name: users users_email_key59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key59 UNIQUE (email);


--
-- TOC entry 4917 (class 2606 OID 69782)
-- Name: users users_email_key6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key6 UNIQUE (email);


--
-- TOC entry 4919 (class 2606 OID 69800)
-- Name: users users_email_key60; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key60 UNIQUE (email);


--
-- TOC entry 4921 (class 2606 OID 69808)
-- Name: users users_email_key61; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key61 UNIQUE (email);


--
-- TOC entry 4923 (class 2606 OID 69802)
-- Name: users users_email_key62; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key62 UNIQUE (email);


--
-- TOC entry 4925 (class 2606 OID 69806)
-- Name: users users_email_key63; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key63 UNIQUE (email);


--
-- TOC entry 4927 (class 2606 OID 69804)
-- Name: users users_email_key64; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key64 UNIQUE (email);


--
-- TOC entry 4929 (class 2606 OID 69730)
-- Name: users users_email_key65; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key65 UNIQUE (email);


--
-- TOC entry 4931 (class 2606 OID 69864)
-- Name: users users_email_key66; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key66 UNIQUE (email);


--
-- TOC entry 4933 (class 2606 OID 69728)
-- Name: users users_email_key67; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key67 UNIQUE (email);


--
-- TOC entry 4935 (class 2606 OID 69866)
-- Name: users users_email_key68; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key68 UNIQUE (email);


--
-- TOC entry 4937 (class 2606 OID 69726)
-- Name: users users_email_key69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key69 UNIQUE (email);


--
-- TOC entry 4939 (class 2606 OID 69820)
-- Name: users users_email_key7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key7 UNIQUE (email);


--
-- TOC entry 4941 (class 2606 OID 69868)
-- Name: users users_email_key70; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key70 UNIQUE (email);


--
-- TOC entry 4943 (class 2606 OID 69724)
-- Name: users users_email_key71; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key71 UNIQUE (email);


--
-- TOC entry 4945 (class 2606 OID 69870)
-- Name: users users_email_key72; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key72 UNIQUE (email);


--
-- TOC entry 4947 (class 2606 OID 69722)
-- Name: users users_email_key73; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key73 UNIQUE (email);


--
-- TOC entry 4949 (class 2606 OID 69872)
-- Name: users users_email_key74; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key74 UNIQUE (email);


--
-- TOC entry 4951 (class 2606 OID 69720)
-- Name: users users_email_key75; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key75 UNIQUE (email);


--
-- TOC entry 4953 (class 2606 OID 69874)
-- Name: users users_email_key76; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key76 UNIQUE (email);


--
-- TOC entry 4955 (class 2606 OID 69718)
-- Name: users users_email_key77; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key77 UNIQUE (email);


--
-- TOC entry 4957 (class 2606 OID 69876)
-- Name: users users_email_key78; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key78 UNIQUE (email);


--
-- TOC entry 4959 (class 2606 OID 69716)
-- Name: users users_email_key79; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key79 UNIQUE (email);


--
-- TOC entry 4961 (class 2606 OID 69780)
-- Name: users users_email_key8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key8 UNIQUE (email);


--
-- TOC entry 4963 (class 2606 OID 69878)
-- Name: users users_email_key80; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key80 UNIQUE (email);


--
-- TOC entry 4965 (class 2606 OID 69714)
-- Name: users users_email_key81; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key81 UNIQUE (email);


--
-- TOC entry 4967 (class 2606 OID 69880)
-- Name: users users_email_key82; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key82 UNIQUE (email);


--
-- TOC entry 4969 (class 2606 OID 69712)
-- Name: users users_email_key83; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key83 UNIQUE (email);


--
-- TOC entry 4971 (class 2606 OID 69882)
-- Name: users users_email_key84; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key84 UNIQUE (email);


--
-- TOC entry 4973 (class 2606 OID 69710)
-- Name: users users_email_key85; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key85 UNIQUE (email);


--
-- TOC entry 4975 (class 2606 OID 69884)
-- Name: users users_email_key86; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key86 UNIQUE (email);


--
-- TOC entry 4977 (class 2606 OID 69708)
-- Name: users users_email_key87; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key87 UNIQUE (email);


--
-- TOC entry 4979 (class 2606 OID 69886)
-- Name: users users_email_key88; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key88 UNIQUE (email);


--
-- TOC entry 4981 (class 2606 OID 69706)
-- Name: users users_email_key89; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key89 UNIQUE (email);


--
-- TOC entry 4983 (class 2606 OID 69778)
-- Name: users users_email_key9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key9 UNIQUE (email);


--
-- TOC entry 4985 (class 2606 OID 69888)
-- Name: users users_email_key90; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key90 UNIQUE (email);


--
-- TOC entry 4987 (class 2606 OID 69704)
-- Name: users users_email_key91; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key91 UNIQUE (email);


--
-- TOC entry 4989 (class 2606 OID 69890)
-- Name: users users_email_key92; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key92 UNIQUE (email);


--
-- TOC entry 4991 (class 2606 OID 69702)
-- Name: users users_email_key93; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key93 UNIQUE (email);


--
-- TOC entry 4993 (class 2606 OID 69892)
-- Name: users users_email_key94; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key94 UNIQUE (email);


--
-- TOC entry 4995 (class 2606 OID 69700)
-- Name: users users_email_key95; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key95 UNIQUE (email);


--
-- TOC entry 4997 (class 2606 OID 69894)
-- Name: users users_email_key96; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key96 UNIQUE (email);


--
-- TOC entry 4999 (class 2606 OID 69698)
-- Name: users users_email_key97; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key97 UNIQUE (email);


--
-- TOC entry 5001 (class 2606 OID 69896)
-- Name: users users_email_key98; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key98 UNIQUE (email);


--
-- TOC entry 5003 (class 2606 OID 69696)
-- Name: users users_email_key99; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key99 UNIQUE (email);


--
-- TOC entry 5005 (class 2606 OID 30565)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5007 (class 2606 OID 69620)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5009 (class 2606 OID 69622)
-- Name: users users_username_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key1 UNIQUE (username);


--
-- TOC entry 5011 (class 2606 OID 69612)
-- Name: users users_username_key10; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key10 UNIQUE (username);


--
-- TOC entry 5013 (class 2606 OID 69488)
-- Name: users users_username_key100; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key100 UNIQUE (username);


--
-- TOC entry 5015 (class 2606 OID 69592)
-- Name: users users_username_key101; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key101 UNIQUE (username);


--
-- TOC entry 5017 (class 2606 OID 69486)
-- Name: users users_username_key102; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key102 UNIQUE (username);


--
-- TOC entry 5019 (class 2606 OID 69634)
-- Name: users users_username_key11; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key11 UNIQUE (username);


--
-- TOC entry 5021 (class 2606 OID 69636)
-- Name: users users_username_key12; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key12 UNIQUE (username);


--
-- TOC entry 5023 (class 2606 OID 69610)
-- Name: users users_username_key13; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key13 UNIQUE (username);


--
-- TOC entry 5025 (class 2606 OID 69638)
-- Name: users users_username_key14; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key14 UNIQUE (username);


--
-- TOC entry 5027 (class 2606 OID 69608)
-- Name: users users_username_key15; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key15 UNIQUE (username);


--
-- TOC entry 5029 (class 2606 OID 69606)
-- Name: users users_username_key16; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key16 UNIQUE (username);


--
-- TOC entry 5031 (class 2606 OID 69640)
-- Name: users users_username_key17; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key17 UNIQUE (username);


--
-- TOC entry 5033 (class 2606 OID 69604)
-- Name: users users_username_key18; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key18 UNIQUE (username);


--
-- TOC entry 5035 (class 2606 OID 69602)
-- Name: users users_username_key19; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key19 UNIQUE (username);


--
-- TOC entry 5037 (class 2606 OID 69624)
-- Name: users users_username_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key2 UNIQUE (username);


--
-- TOC entry 5039 (class 2606 OID 69642)
-- Name: users users_username_key20; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key20 UNIQUE (username);


--
-- TOC entry 5041 (class 2606 OID 69600)
-- Name: users users_username_key21; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key21 UNIQUE (username);


--
-- TOC entry 5043 (class 2606 OID 69598)
-- Name: users users_username_key22; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key22 UNIQUE (username);


--
-- TOC entry 5045 (class 2606 OID 69644)
-- Name: users users_username_key23; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key23 UNIQUE (username);


--
-- TOC entry 5047 (class 2606 OID 69646)
-- Name: users users_username_key24; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key24 UNIQUE (username);


--
-- TOC entry 5049 (class 2606 OID 69596)
-- Name: users users_username_key25; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key25 UNIQUE (username);


--
-- TOC entry 5051 (class 2606 OID 69648)
-- Name: users users_username_key26; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key26 UNIQUE (username);


--
-- TOC entry 5053 (class 2606 OID 69594)
-- Name: users users_username_key27; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key27 UNIQUE (username);


--
-- TOC entry 5055 (class 2606 OID 69650)
-- Name: users users_username_key28; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key28 UNIQUE (username);


--
-- TOC entry 5057 (class 2606 OID 69590)
-- Name: users users_username_key29; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key29 UNIQUE (username);


--
-- TOC entry 5059 (class 2606 OID 69626)
-- Name: users users_username_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key3 UNIQUE (username);


--
-- TOC entry 5061 (class 2606 OID 69652)
-- Name: users users_username_key30; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key30 UNIQUE (username);


--
-- TOC entry 5063 (class 2606 OID 69588)
-- Name: users users_username_key31; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key31 UNIQUE (username);


--
-- TOC entry 5065 (class 2606 OID 69654)
-- Name: users users_username_key32; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key32 UNIQUE (username);


--
-- TOC entry 5067 (class 2606 OID 69586)
-- Name: users users_username_key33; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key33 UNIQUE (username);


--
-- TOC entry 5069 (class 2606 OID 69656)
-- Name: users users_username_key34; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key34 UNIQUE (username);


--
-- TOC entry 5071 (class 2606 OID 69584)
-- Name: users users_username_key35; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key35 UNIQUE (username);


--
-- TOC entry 5073 (class 2606 OID 69658)
-- Name: users users_username_key36; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key36 UNIQUE (username);


--
-- TOC entry 5075 (class 2606 OID 69582)
-- Name: users users_username_key37; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key37 UNIQUE (username);


--
-- TOC entry 5077 (class 2606 OID 69660)
-- Name: users users_username_key38; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key38 UNIQUE (username);


--
-- TOC entry 5079 (class 2606 OID 69580)
-- Name: users users_username_key39; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key39 UNIQUE (username);


--
-- TOC entry 5081 (class 2606 OID 69628)
-- Name: users users_username_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key4 UNIQUE (username);


--
-- TOC entry 5083 (class 2606 OID 69662)
-- Name: users users_username_key40; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key40 UNIQUE (username);


--
-- TOC entry 5085 (class 2606 OID 69578)
-- Name: users users_username_key41; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key41 UNIQUE (username);


--
-- TOC entry 5087 (class 2606 OID 69664)
-- Name: users users_username_key42; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key42 UNIQUE (username);


--
-- TOC entry 5089 (class 2606 OID 69576)
-- Name: users users_username_key43; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key43 UNIQUE (username);


--
-- TOC entry 5091 (class 2606 OID 69574)
-- Name: users users_username_key44; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key44 UNIQUE (username);


--
-- TOC entry 5093 (class 2606 OID 69666)
-- Name: users users_username_key45; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key45 UNIQUE (username);


--
-- TOC entry 5095 (class 2606 OID 69572)
-- Name: users users_username_key46; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key46 UNIQUE (username);


--
-- TOC entry 5097 (class 2606 OID 69668)
-- Name: users users_username_key47; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key47 UNIQUE (username);


--
-- TOC entry 5099 (class 2606 OID 69570)
-- Name: users users_username_key48; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key48 UNIQUE (username);


--
-- TOC entry 5101 (class 2606 OID 69670)
-- Name: users users_username_key49; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key49 UNIQUE (username);


--
-- TOC entry 5103 (class 2606 OID 69630)
-- Name: users users_username_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key5 UNIQUE (username);


--
-- TOC entry 5105 (class 2606 OID 69568)
-- Name: users users_username_key50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key50 UNIQUE (username);


--
-- TOC entry 5107 (class 2606 OID 69672)
-- Name: users users_username_key51; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key51 UNIQUE (username);


--
-- TOC entry 5109 (class 2606 OID 69566)
-- Name: users users_username_key52; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key52 UNIQUE (username);


--
-- TOC entry 5111 (class 2606 OID 69564)
-- Name: users users_username_key53; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key53 UNIQUE (username);


--
-- TOC entry 5113 (class 2606 OID 69674)
-- Name: users users_username_key54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key54 UNIQUE (username);


--
-- TOC entry 5115 (class 2606 OID 69562)
-- Name: users users_username_key55; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key55 UNIQUE (username);


--
-- TOC entry 5117 (class 2606 OID 69676)
-- Name: users users_username_key56; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key56 UNIQUE (username);


--
-- TOC entry 5119 (class 2606 OID 69560)
-- Name: users users_username_key57; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key57 UNIQUE (username);


--
-- TOC entry 5121 (class 2606 OID 69678)
-- Name: users users_username_key58; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key58 UNIQUE (username);


--
-- TOC entry 5123 (class 2606 OID 69558)
-- Name: users users_username_key59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key59 UNIQUE (username);


--
-- TOC entry 5125 (class 2606 OID 69618)
-- Name: users users_username_key6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key6 UNIQUE (username);


--
-- TOC entry 5127 (class 2606 OID 69680)
-- Name: users users_username_key60; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key60 UNIQUE (username);


--
-- TOC entry 5129 (class 2606 OID 69556)
-- Name: users users_username_key61; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key61 UNIQUE (username);


--
-- TOC entry 5131 (class 2606 OID 69682)
-- Name: users users_username_key62; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key62 UNIQUE (username);


--
-- TOC entry 5133 (class 2606 OID 69554)
-- Name: users users_username_key63; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key63 UNIQUE (username);


--
-- TOC entry 5135 (class 2606 OID 69684)
-- Name: users users_username_key64; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key64 UNIQUE (username);


--
-- TOC entry 5137 (class 2606 OID 69552)
-- Name: users users_username_key65; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key65 UNIQUE (username);


--
-- TOC entry 5139 (class 2606 OID 69686)
-- Name: users users_username_key66; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key66 UNIQUE (username);


--
-- TOC entry 5141 (class 2606 OID 69550)
-- Name: users users_username_key67; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key67 UNIQUE (username);


--
-- TOC entry 5143 (class 2606 OID 69688)
-- Name: users users_username_key68; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key68 UNIQUE (username);


--
-- TOC entry 5145 (class 2606 OID 69548)
-- Name: users users_username_key69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key69 UNIQUE (username);


--
-- TOC entry 5147 (class 2606 OID 69632)
-- Name: users users_username_key7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key7 UNIQUE (username);


--
-- TOC entry 5149 (class 2606 OID 69690)
-- Name: users users_username_key70; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key70 UNIQUE (username);


--
-- TOC entry 5151 (class 2606 OID 69546)
-- Name: users users_username_key71; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key71 UNIQUE (username);


--
-- TOC entry 5153 (class 2606 OID 69544)
-- Name: users users_username_key72; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key72 UNIQUE (username);


--
-- TOC entry 5155 (class 2606 OID 69542)
-- Name: users users_username_key73; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key73 UNIQUE (username);


--
-- TOC entry 5157 (class 2606 OID 69540)
-- Name: users users_username_key74; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key74 UNIQUE (username);


--
-- TOC entry 5159 (class 2606 OID 69538)
-- Name: users users_username_key75; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key75 UNIQUE (username);


--
-- TOC entry 5161 (class 2606 OID 69536)
-- Name: users users_username_key76; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key76 UNIQUE (username);


--
-- TOC entry 5163 (class 2606 OID 69534)
-- Name: users users_username_key77; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key77 UNIQUE (username);


--
-- TOC entry 5165 (class 2606 OID 69532)
-- Name: users users_username_key78; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key78 UNIQUE (username);


--
-- TOC entry 5167 (class 2606 OID 69530)
-- Name: users users_username_key79; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key79 UNIQUE (username);


--
-- TOC entry 5169 (class 2606 OID 69616)
-- Name: users users_username_key8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key8 UNIQUE (username);


--
-- TOC entry 5171 (class 2606 OID 69528)
-- Name: users users_username_key80; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key80 UNIQUE (username);


--
-- TOC entry 5173 (class 2606 OID 69526)
-- Name: users users_username_key81; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key81 UNIQUE (username);


--
-- TOC entry 5175 (class 2606 OID 69524)
-- Name: users users_username_key82; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key82 UNIQUE (username);


--
-- TOC entry 5177 (class 2606 OID 69522)
-- Name: users users_username_key83; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key83 UNIQUE (username);


--
-- TOC entry 5179 (class 2606 OID 69518)
-- Name: users users_username_key84; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key84 UNIQUE (username);


--
-- TOC entry 5181 (class 2606 OID 69516)
-- Name: users users_username_key85; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key85 UNIQUE (username);


--
-- TOC entry 5183 (class 2606 OID 69514)
-- Name: users users_username_key86; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key86 UNIQUE (username);


--
-- TOC entry 5185 (class 2606 OID 69512)
-- Name: users users_username_key87; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key87 UNIQUE (username);


--
-- TOC entry 5187 (class 2606 OID 69510)
-- Name: users users_username_key88; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key88 UNIQUE (username);


--
-- TOC entry 5189 (class 2606 OID 69508)
-- Name: users users_username_key89; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key89 UNIQUE (username);


--
-- TOC entry 5191 (class 2606 OID 69614)
-- Name: users users_username_key9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key9 UNIQUE (username);


--
-- TOC entry 5193 (class 2606 OID 69506)
-- Name: users users_username_key90; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key90 UNIQUE (username);


--
-- TOC entry 5195 (class 2606 OID 69504)
-- Name: users users_username_key91; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key91 UNIQUE (username);


--
-- TOC entry 5197 (class 2606 OID 69502)
-- Name: users users_username_key92; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key92 UNIQUE (username);


--
-- TOC entry 5199 (class 2606 OID 69500)
-- Name: users users_username_key93; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key93 UNIQUE (username);


--
-- TOC entry 5201 (class 2606 OID 69498)
-- Name: users users_username_key94; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key94 UNIQUE (username);


--
-- TOC entry 5203 (class 2606 OID 69496)
-- Name: users users_username_key95; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key95 UNIQUE (username);


--
-- TOC entry 5205 (class 2606 OID 69494)
-- Name: users users_username_key96; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key96 UNIQUE (username);


--
-- TOC entry 5207 (class 2606 OID 69492)
-- Name: users users_username_key97; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key97 UNIQUE (username);


--
-- TOC entry 5209 (class 2606 OID 69490)
-- Name: users users_username_key98; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key98 UNIQUE (username);


--
-- TOC entry 5211 (class 2606 OID 69520)
-- Name: users users_username_key99; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key99 UNIQUE (username);


--
-- TOC entry 5218 (class 1259 OID 30752)
-- Name: restaurant_votes_user_id_restaurant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX restaurant_votes_user_id_restaurant_id ON public.restaurant_votes USING btree (user_id, restaurant_id);


--
-- TOC entry 5223 (class 1259 OID 30779)
-- Name: review_votes_user_id_review_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX review_votes_user_id_review_id ON public.review_votes USING btree (user_id, review_id);


--
-- TOC entry 5447 (class 2620 OID 30690)
-- Name: restaurants trg_auto_upvote_restaurant; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auto_upvote_restaurant AFTER INSERT ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.auto_upvote_restaurant();


--
-- TOC entry 5449 (class 2620 OID 30692)
-- Name: reviews trg_auto_upvote_review; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auto_upvote_review AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.auto_upvote_review();


--
-- TOC entry 5461 (class 2620 OID 47818)
-- Name: password_reset_tokens trg_cleanup_old_reset_tokens; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cleanup_old_reset_tokens AFTER INSERT ON public.password_reset_tokens FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_reset_tokens();


--
-- TOC entry 5453 (class 2620 OID 69480)
-- Name: restaurant_votes trg_cleanup_restaurant_vote_notif; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cleanup_restaurant_vote_notif AFTER UPDATE ON public.restaurant_votes FOR EACH ROW WHEN ((old.vote IS DISTINCT FROM new.vote)) EXECUTE FUNCTION public.cleanup_old_restaurant_vote_notif();


--
-- TOC entry 5456 (class 2620 OID 69478)
-- Name: review_votes trg_cleanup_review_vote_notif; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cleanup_review_vote_notif AFTER UPDATE ON public.review_votes FOR EACH ROW WHEN ((old.vote IS DISTINCT FROM new.vote)) EXECUTE FUNCTION public.cleanup_old_review_vote_notif();


--
-- TOC entry 5454 (class 2620 OID 70136)
-- Name: restaurant_votes trg_delete_restaurant_vote_notification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_delete_restaurant_vote_notification AFTER DELETE ON public.restaurant_votes FOR EACH ROW EXECUTE FUNCTION public.delete_restaurant_vote_notification();


--
-- TOC entry 5450 (class 2620 OID 69482)
-- Name: reviews trg_delete_review_notifications; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_delete_review_notifications AFTER DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.delete_review_notifications();


--
-- TOC entry 5457 (class 2620 OID 70138)
-- Name: review_votes trg_delete_review_vote_notification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_delete_review_vote_notification AFTER DELETE ON public.review_votes FOR EACH ROW EXECUTE FUNCTION public.delete_review_vote_notification();


--
-- TOC entry 5448 (class 2620 OID 70140)
-- Name: restaurants trg_lock_created_at_restaurants; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_lock_created_at_restaurants BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.lock_created_at_restaurants();


--
-- TOC entry 5459 (class 2620 OID 70134)
-- Name: notifications trg_notifications_delete_notify; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notifications_delete_notify AFTER DELETE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notif_delete_notify();


--
-- TOC entry 5460 (class 2620 OID 70132)
-- Name: notifications trg_notifications_insert_notify; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notifications_insert_notify AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notif_insert_notify();


--
-- TOC entry 5451 (class 2620 OID 30697)
-- Name: reviews trg_notify_review_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notify_review_activity AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.notify_review_activity();


--
-- TOC entry 5455 (class 2620 OID 67446)
-- Name: restaurant_votes trg_notify_vote_restaurant; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notify_vote_restaurant AFTER INSERT ON public.restaurant_votes FOR EACH ROW EXECUTE FUNCTION public.notify_vote();


--
-- TOC entry 5458 (class 2620 OID 67447)
-- Name: review_votes trg_notify_vote_review; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notify_vote_review AFTER INSERT ON public.review_votes FOR EACH ROW EXECUTE FUNCTION public.notify_vote();


--
-- TOC entry 5452 (class 2620 OID 30688)
-- Name: reviews trg_update_review_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_review_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_review_updated_at();


--
-- TOC entry 5444 (class 2606 OID 69469)
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5445 (class 2606 OID 69464)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5446 (class 2606 OID 69900)
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5440 (class 2606 OID 70125)
-- Name: restaurant_votes restaurant_votes_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_votes
    ADD CONSTRAINT restaurant_votes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5441 (class 2606 OID 70120)
-- Name: restaurant_votes restaurant_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_votes
    ADD CONSTRAINT restaurant_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5436 (class 2606 OID 70115)
-- Name: restaurants restaurants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5442 (class 2606 OID 69458)
-- Name: review_votes review_votes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5443 (class 2606 OID 69453)
-- Name: review_votes review_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5437 (class 2606 OID 69448)
-- Name: reviews reviews_parent_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_parent_review_id_fkey FOREIGN KEY (parent_review_id) REFERENCES public.reviews(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5438 (class 2606 OID 69443)
-- Name: reviews reviews_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5439 (class 2606 OID 69438)
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2026-01-05 14:24:09

--
-- PostgreSQL database dump complete
--

\unrestrict sZCiPHjXZa3pgVJKLsdvomIgfH9CP9kVwcPtI7OWr9H3FaPhfkICwODsk44TOAE

