a\ :sup:`2`\ v: Avalanche Auto Validator
----------------------------------------

NOTE: this tool is still in its early stage (I'm personally using it though).
Stay tuned for the updates.

Features
========

- Simple, one script solution for validator management.
- Self-contained, easy-to-use.

How to Use
==========

- First make sure you have one or more Docker hosts (servers) running, with SSH access of them:

  - An example is to launch an Ubuntu instance on AWS EC2;
  - install ``sudo apt update && sudo apt install docker.io``;
  - add ``ubuntu`` to ``docker`` group: ``sudo gpasswd -a ubuntu docker``;
  - start Docker: ``sudo systemctl start docker && sudo systemctl enable docker``.
  - check: if you can run ``docker ps`` as ``ubuntu`` user, then everything is configured properly.

- Then modify ``validator.js`` to suit your needs.

  - The exmaple shows two hosts named "docker1" and "docker2".  docker1
    supports four validators: "staker0", "staker1", "staker2", "staker3", while
    docker2 supports three.  The corresponding cert and key files for each
    validator should be placed under ``./keys``, such as ``staker0.key``.

  - Change ``host`` to your docker host address.
  - Configure SSH access accordingly.
  - Change ``workDir`` to where you would like to keep the databases and logs (and also the user has access to).

- ``npm install``

- Before we start the validators, we need to build the image on the remote host(s):

  ::

     ./a2v.js buildImage <your-host>

  (``<your-host>`` could be ``docker1``, for example). This builds a
  ready-to-use avalanchego image on the selected host, with the release version
  specified in ``validators.json`` (``release`` field).

- Now we can start all validators on a given host:

  ::

     ./a2v.js run <your-host>

  Done!

- To stop all validators on a given host:

  ::

     ./a2v.js stop <your-host>
