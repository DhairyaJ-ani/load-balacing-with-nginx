worker_processes 1;

events {
	worker_connections 1024;
}

http {
	include mime.types;

	upstream nodeJS_cluster {
		least_conn;
		server 127.0.0.1:3001;
		server 127.0.0.1:3002;
		server 127.0.0.1:3003;
	}

	server {
		listen 443 ssl;
		server_name localhost;

        ssl_certificate path_to_certificate;
        ssl_certificate_key path_to_certificate_key;

		location / {
			proxy_pass http://nodeJS_cluster;
			proxy_set_header Host $host;
			proxy_set_header X-Real-IP $remote_addr;
		}

	}
}