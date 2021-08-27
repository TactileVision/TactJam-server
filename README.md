# TactJam-server

![TactJam setup](https://github.com/TactileVision/TactJam-server/wiki/img/TactJam-Teaser.jpg)

TactJam is a collaborative playground for composing spatial tactons. The project is split into the following repositories:

- Hardware interface: [https://github.com/TactileVision/TactJam-hardware](https://github.com/TactileVision/TactJam-hardware)
- Firmware driving the hardware: [https://github.com/TactileVision/TactJam-firmware](https://github.com/TactileVision/TactJam-firmware)
- GUI client to view and edit tactons: [https://github.com/TactileVision/TactJam-client](https://github.com/TactileVision/TactJam-client)
- Server to store and manage tactons: [https://github.com/TactileVision/TactJam-server](https://github.com/TactileVision/TactJam-server)

## The server

Our goal is to deliver a stable API server for handling the data from the users of the TactJam workshop.
Our [TactJam-Client](https://github.com/TactileVision/TactJam-client) will communicate with this backend to save, edit or delete user generated tactons.

## Documentation of the endpoints

The documentation of the server is automatically generated with JSdoc and swagger.
Please go to `/docs` to see all available endpoints.

### Security

This server handles user data (email, password), which means we need to develop it as safe as possible. Passwords will only be stored as an hash.
We're using the [award-winning](https://www.password-hashing.net/) **Argon2** hashing algorithm to create the hashes which will be saved to the database then.

#### Server Location

The live-server will be located at the HTW-Dresden. There are access restrictions in place. Unauthorized will have no access to the data or logs on the server.

### Installation

Install dependencies first
`yarn install`

Make a copy of the [.env.example](https://raw.githubusercontent.com/TactileVision/TactJam-server/main/.env.example) file, call it `.env` and adjust the values in it to suit your environment.

Now Make sure the database is initialized and the postgREST server is working (see [database.md](https://raw.githubusercontent.com/TactileVision/TactJam-server/main/database/database.md)).

#### Dev server with hotreload

`yarn dev`

#### Start server

`yarn start`

## Database

You can find information about the database in the [database.md](https://raw.githubusercontent.com/TactileVision/TactJam-server/main/database/database.md).

## How to contribute

Anyone with the passion for free software is welcome to contribute to this project by:

- 👩‍💻 developing software
- 👾 filing any [issues](https://github.com/TactileVision/TactJam-server/issues) or suggesting new features
- 🧑‍🏭 sending [pull requests](https://github.com/TactileVision/TactJam-server/pulls) for fixed bugs or new features

Before you start, please take a look at the project [board](https://github.com/orgs/TactileVision/projects/1)
and the [issues](https://github.com/TactileVision/TactJam-server/issues).
Maybe there is already a similar bug or feature request that is already under construction and may need your expertise and support.

### Branching model

In 2010 Vincent Driessen wrote a nice blog post where he introduced a branching model called [git-flow](https://nvie.com/posts/a-successful-git-branching-model/).
Over the years it became very popular and was used in many projects.
Meanwhile GitHub introduced a much simpler workflow called [GitHub flow](https://guides.github.com/introduction/flow/).
Both approaches have their pros and cons. That’s why we use a combination – git-flow as the branching model and the pull request workflow suggested in GitHub flow.

### How to commit

To make contribution easier for everyone we like use a common structure of git commit messages:

```
<type>[optional scope]: <description>
[optional body]
[optional footer(s)]
```

Please refer to [www.conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/) for more information.

### Code style

This might not be the world’s largest code base. However, a consistent code style makes it easier to read and maintain.
For this server we use [eslint](https://eslint.org/) in combination with [prettier](https://prettier.io/).
You can find our configuration in the [package.json](https://raw.githubusercontent.com/TactileVision/TactJam-server/main/package.json).
Please only commit code in this code style.

## Copyright

TactJam-hardware is (C) 2020 Tactile Vision

It is licensed under the MIT license. For details, please refer to the [LICENSE](LICENSE) file.
