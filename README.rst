a\ :sup:`2`\ v: Avalanche Automated Validators
----------------------------------------------

Features
========

- Simple, one script solution for validator management.
- Self-contained, easy-to-use.

How to Use
==========

- First make sure you have one or more Docker hosts (servers) running, with SSH
  access of them. An example is to launch an Ubuntu instance on AWS EC2. The
  following commands are run on the host to setup (only need to setup once):

  - install ``sudo apt update && sudo apt install docker.io``;
  - add ``ubuntu`` to ``docker`` group: ``sudo gpasswd -a ubuntu docker``;
  - start Docker: ``sudo systemctl start docker && sudo systemctl enable docker``.
  - check: if you can run ``docker ps`` as ``ubuntu`` user, then everything is configured properly.
  - (only for those who want to follow an example): ``sudo mkdir -p /bigboy/stakers && sudo chown ubuntu:ubuntu -R /bigboy/stakers``

- Then modify ``validators.json`` to suit your needs.

  - The exmaple shows three hosts named "example", "docker1" and "docker2":

    - ``example`` will host one validator "mystaker" (and uses localhost),
    - ``docker1`` will host four validators: "staker0", "staker1", "staker2", "staker3",
    - ``docker2`` will host three.

    The corresponding cert and key files for each validator should be placed
    under ``./keys``, such as ``staker0.key``.

  - Change ``host`` to your docker host address.
  - Configure SSH ``privateKey`` accordingly.
  - Change ``workDir`` to where you would like to keep the databases and logs (and also the user has access to).

- Install a2v: ``npm install -g a2v``.

- Before we start the validators, we need to build the image on the remote host(s):

  ::

     a2v buildImage <your-host>

  (``<your-host>`` could be ``example``, for example). This builds a
  ready-to-use avalanchego image on the selected host, with the release version
  specified in ``validators.json`` (``release`` field).

- Now we can start all validators on a given host:

  ::

     a2v run <your-host>

  Done!

- To stop all validators on a given host:

  ::

     a2v stop <your-host>

- For more usage: ``a2v --help``:

  ::

           ___
     ___ _|_  |  __
    / _ `/ __/ |/ /
    \_,_/____/___/    Avalanche Automated Validators

    Commands:
    a2v run [host-id] [node-id]             start the container(s) on the given host
    a2v stop [host-id] [node-id] [--force]  stop the container(s) on the given host
    a2v buildImage [host-id]                build avalanchego image on the given host
    a2v show [host-id] [node-id]            show validators on the given host
    a2v showImage [host-id]                 show avalanchego images on the given host
    a2v rmImage <host-id> <image-tag>       remove the specified avalanchego image on the given host
    a2v genKey <node-id>                    randomly generate a new <node-id>.key and <node-id>.crt
    a2v prune [host-id]                     prune unused containers and images on the given host

    Options:
    --help     Show help                                                                [boolean]
    -c, --profile  JSON file that describes all validators    [string] [default: "./validators.json"]
    --version  Show version number                                                      [boolean]
