#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <err.h>

#include<algorithm>
#include<thread>
#include<queue>
#include<mutex>
#include<condition_variable>

int global_ind = 0;

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

class ThreadInfo {
    std::thread d_thread;
    std::queue<int> d_clients;
    std::mutex d_queueMutex;
    std::condition_variable d_condVar;
    bool d_cancel = false;
    int index;
public:
    ThreadInfo() : index(global_ind++) {
        d_thread = std::move(std::thread([this] {threadRoutine();}));
    }

    ~ThreadInfo() {
        d_cancel = true;
        d_condVar.notify_all();
        d_thread.join();
    }

    size_t getClientsCount() const {
        return d_clients.size();
    }

    void addConnection(int i_socket) {
        std::lock_guard<std::mutex> lg{d_queueMutex};
        d_clients.push(i_socket);
        d_condVar.notify_all();
    }

    void threadRoutine() {
        while(true) {
            {
                std::unique_lock<std::mutex> lk(d_queueMutex);
                d_condVar.wait(lk,[this] {return !d_clients.empty() || d_cancel; } );
            }

            if (d_cancel)
                return;

            while (!d_clients.empty() && !d_cancel) {
                int client_fd = -1;
                {
                    std::lock_guard<std::mutex> lg{d_queueMutex};
                    client_fd = d_clients.front();
                    d_clients.pop();
                    d_condVar.notify_all();
                }

                char buff[4096];
                read(client_fd, buff, 4096);
                printf(buff);
                printf("FROM THREAD %d\n\n\n", index);
                write(client_fd, response, sizeof(response) - 1);
                shutdown(client_fd, 1);
                close(client_fd);
            }
        }
    }
};

class ThreadPool{
    std::vector<ThreadInfo> d_threads;
public:
    ThreadPool() : d_threads(10) {}

    ThreadPool(size_t i_threadCount) : d_threads(i_threadCount) {}
    void addConnection(int i_socket) {
        auto thread = std::min_element(d_threads.begin(), d_threads.end(),
                                       [](const ThreadInfo& a, const ThreadInfo& b){
                                           return a.getClientsCount() < b.getClientsCount();
                                       });
        thread->addConnection(i_socket);
    }
};

int main(int argc, char** argv) {
    int thread_count = 10;
    if (argc > 1) {
        thread_count = atoi(argv[1]);
    }
    ThreadPool pool(thread_count);

    int one = 1, client_fd;
    int port = 8080;
    struct sockaddr_in svr_addr, cli_addr;
    socklen_t sin_len = sizeof(cli_addr);

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        err(1, "Can't open socket");
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
        //printf("Connected successfully!!!\\n");
        if (client_fd == -1) {
            perror("Can't accept");
            continue;
        }
        pool.addConnection(client_fd);
    }
}