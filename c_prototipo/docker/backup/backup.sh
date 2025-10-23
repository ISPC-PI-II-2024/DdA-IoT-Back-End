#!/bin/bash
BACKUP_DIR="/home/fernandogc/docker/backup"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Iniciando backup: $DATE"

# Backup de volúmenes importantes
docker run --rm -v silo-mariadb_data:/source -v $BACKUP_DIR:/backup alpine \
    tar czf /backup/mariadb_$DATE.tar.gz -C /source ./

docker run --rm -v silo-influxdb_data:/source -v $BACKUP_DIR:/backup alpine \
    tar czf /backup/influxdb_$DATE.tar.gz -C /source ./

docker run --rm -v silo-grafana_data:/source -v $BACKUP_DIR:/backup alpine \
    tar czf /backup/grafana_$DATE.tar.gz -C /source ./

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completado: $DATE"

