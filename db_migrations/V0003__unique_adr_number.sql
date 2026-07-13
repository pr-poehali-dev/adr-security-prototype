-- Уникальность номера ADR как дополнительная защита от гонок при создании
CREATE UNIQUE INDEX IF NOT EXISTS adrs_number_unique_idx ON t_p98037960_adr_security_prototy.adrs (number);