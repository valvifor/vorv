#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <err.h>

char response[] = "HTTP/1.1 200 OK\r\n"
                  "Content-Type: text/html; charset=UTF-8\r\n\r\n"
                  "<!DOCTYPE html>"
                  "<html>"
                    "<head>"
                        "<title>Hello</title>"
                        "<style>"
                            "body { background-color: #0000ff }"
                            "h1 { text-align: center; color: white;}"
                        "</style>"
                    "</head>"
                    "<body><h1>Hello, world!</h1></body>"
                  "</html>\r\n";

int main() {
    int one = 1, client_fd;
    int port = 8080;
    int buf_size = 4096;
    struct sockaddr_in svr_addr, cli_addr;
    socklen_t sin_len = sizeof(cli_addr);

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        err(1, "Сan't open socket");
    }

    setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(int));

    svr_addr.sin_family = AF_INET;
    svr_addr.sin_addr.s_addr = INADDR_ANY;
    svr_addr.sin_port = htons(port);

    if (bind(sock, (struct sockaddr *) &svr_addr, sizeof(svr_addr)) == -1) {
        close(sock);
        err(1, "Can't bind");
    }

    listen(sock, 5);
    while (1) {
        client_fd = accept(sock, (struct sockaddr *) &cli_addr, &sin_len);
        printf("Connected successfully!!!\n");

        if (client_fd == -1) {
            perror("Can't accept");
            continue;
        }
        char buff[buf_size];
        read(client_fd, buff, buf_size);
        printf(buff);
        write(client_fd, response, sizeof(response) - 1);
        close(client_fd);
    }
}