-- Si les colonnes d'impression étaient en TEXT (max 64 Ko), les images base64 échouaient à l'enregistrement.
ALTER TABLE clinic_profiles MODIFY COLUMN print_header_a4 LONGTEXT;
ALTER TABLE clinic_profiles MODIFY COLUMN print_footer_a4 LONGTEXT;
ALTER TABLE clinic_profiles MODIFY COLUMN print_header_a5 LONGTEXT;
ALTER TABLE clinic_profiles MODIFY COLUMN print_footer_a5 LONGTEXT;
