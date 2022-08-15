// import * as tweetRepository from '../data/tweet.js';
// import { getSocketIO } from '../connection/socket.js';

export class TweetController {
  constructor(tweetRepository, getSocketIO) {
    this.tweetRepository = tweetRepository;
    this.getSocketIO = this.getSocketIO;
  }

  getTweets = async (req, res) => {
    const username = req.query.username;
    const data = await (username
        ? this.tweetRepository.getAllByUsername(username)
        : this.tweetRepository.getAll());
    res.status(200).json(data);
  }

  getTweet = async (req, res, next) => {
    const id = req.params.id;
    const tweet = await this.tweetRepository.getById(id);
    if (tweet) {
      res.status(200).json(tweet);
    } else {
      res.status(404).json({message: `Tweet id(${id}) not found`});
    }
  }

  createTweet = async (req, res, next) => {
    const {text} = req.body;
    const tweet = await this.tweetRepository.create(text, req.userId);
    res.status(201).json(tweet);
    this.getSocketIO().emit('tweets', tweet);
  }

  updateTweet = async (req, res, next) => {
    const id = req.params.id;
    const text = req.body.text;
    const tweet = await this.tweetRepository.getById(id);
    if (!tweet) {
      return res.status(404).json({message: `Tweet not found: ${id}`});
    }
    if (tweet.userId !== req.userId) {
      return res.sendStatus(403);
    }
    const updated = await this.tweetRepository.update(id, text);
    res.status(200).json(updated);
  }

  deleteTweet = async (req, res, next) => {
    const id = req.params.id;
    const tweet = await this.tweetRepository.getById(id);
    if (!tweet) {
      return res.status(404).json({message: `Tweet not found: ${id}`});
    }
    if (tweet.userId !== req.userId) {
      return res.sendStatus(403);
    }
    await this.tweetRepository.remove(id);
    res.sendStatus(204);
  }
}

// export async function getTweets(req, res) {
//   const username = req.query.username;
//   const data = await (username
//     ? this.tweetRepository.getAllByUsername(username)
//     : this.tweetRepository.getAll());
//   res.status(200).json(data);
// }
//
// export async function getTweet(req, res, next) {
//   const id = req.params.id;
//   const tweet = await this.tweetRepository.getById(id);
//   if (tweet) {
//     res.status(200).json(tweet);
//   } else {
//     res.status(404).json({ message: `Tweet id(${id}) not found` });
//   }
// }
//
// export async function createTweet(req, res, next) {
//   const { text } = req.body;
//   const tweet = await this.tweetRepository.create(text, req.userId);
//   res.status(201).json(tweet);
//   this.getSocketIO().emit('tweets', tweet);
// }
//
// export async function updateTweet(req, res, next) {
//   const id = req.params.id;
//   const text = req.body.text;
//   const tweet = await this.tweetRepository.getById(id);
//   if (!tweet) {
//     return res.status(404).json({ message: `Tweet not found: ${id}` });
//   }
//   if (tweet.userId !== req.userId) {
//     return res.sendStatus(403);
//   }
//   const updated = await this.tweetRepository.update(id, text);
//   res.status(200).json(updated);
// }
//
// export async function deleteTweet(req, res, next) {
//   const id = req.params.id;
//   const tweet = await this.tweetRepository.getById(id);
//   if (!tweet) {
//     return res.status(404).json({ message: `Tweet not found: ${id}` });
//   }
//   if (tweet.userId !== req.userId) {
//     return res.sendStatus(403);
//   }
//   await this.tweetRepository.remove(id);
//   res.sendStatus(204);
// }
